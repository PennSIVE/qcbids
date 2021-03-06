const sqlite3 = require('sqlite3').verbose()
const express = require('express')
const path = require('path')
const fs = require('fs')
const mime = require('mime')
const app = express()
const port = process.env.PORT || 3000
const db = new sqlite3.Database(process.env.DB_FILE || '/usr/src/data/db.sqlite')
const imagePath = process.env.IMAGE_PATH || '/usr/src/data/images'

const bidsName = (metaData) => {
    // for example: sub-0003_ses-002_acq-lowres_run-001_FLAIR.nii.gz
    let ret = '';
    if ('subject' in metaData) {
        ret += `sub-${metaData['subject']}`
    }
    if ('session' in metaData) {
        ret += `_ses-${metaData['session']}`
    }
    if ('acquisition' in metaData) {
        ret += `_acq-${metaData['acquisition']}`
    }
    if ('run' in metaData) {
        ret += `_run-${metaData['run'].padStart(3, '0')}` // todo figure out why run isn't 0-padded
    }
    if ('suffix' in metaData) {
        ret += `_${metaData['suffix']}`
    }
    return ret;
}

const loadSubjects = (res, page, limit, skipReviewed = true, importantModalities = ['t1_fast', 'thalamus', 'mimosa_binary_mask', 'flair_n4_brain_ws', 't1_n4_reg_brain_ws']) => {
    let layout = {}
    let offset = page * limit
    let targetScans = (importantModalities.length > 0) ? `AND (${importantModalities.map(x => 'file_path LIKE "%' + x + '%"').join(' OR ')})` : ''
    let subjects = (skipReviewed) ?
        `SELECT value FROM
            (SELECT DISTINCT _value AS value, COUNT(*) AS num_subj_images,
                (SELECT COUNT(*) AS cnt FROM reports WHERE subject_id = CAST(_value AS INT)) AS num_subj_reports
            FROM tags WHERE entity_name = 'subject' ${targetScans} GROUP BY _value)
            WHERE num_subj_images > num_subj_reports ORDER BY value ASC LIMIT ${limit} OFFSET ${offset}` :
        `SELECT DISTINCT _value AS value FROM tags WHERE entity_name = 'subject' ORDER BY _value ASC LIMIT ${limit} OFFSET ${offset}`
    db.all(subjects, [], (err, rows) => {
        if (err) throw err;

        let nrow = rows.length
        let ret = []
        if (nrow === 0) {
            res.send(ret)
        }
        rows.forEach((row) => {
            // for each subject
            let subjLabel = row.value
            let sql = `SELECT file_path, entity_name, _value AS value, '${subjLabel}' AS subj FROM tags
                                WHERE file_path LIKE '%sub-${subjLabel}%.nii.gz' AND
                                (entity_name = 'suffix' OR entity_name = 'session' OR entity_name = 'subject' OR entity_name = 'run' OR entity_name = 'acquisition')
                                ORDER BY file_path ASC`
            layout[subjLabel] = {
                id: subjLabel,
                folders: [], // each nifti has a folder of jpegs
                files: {}, // the actual jpegs, indexed by folder name
                niftis: {}, // folder name => actual path to nifti
                report: {}
            }

            db.all(`SELECT content, rating, scan, '${subjLabel}' AS subj FROM reports WHERE subject_id = '${subjLabel}'`, [], (err, rows) => {
                if (err) throw err;
                rows.forEach((row) => {
                    layout[row.subj].report[row.scan] = {
                        content: row.content,
                        rating: row.rating
                    }
                })
            })

            let lastPath = undefined
            let currentMetaData = {}
            db.all(sql, [], (err, rows) => {
                if (err) throw err;
                rows.forEach((row) => {
                    // for each subject tag
                    if (lastPath !== row.file_path && Object.keys(currentMetaData).length > 0) {
                        // we've gotten to a new file, push old
                        let folderName = bidsName(currentMetaData)
                        layout[row.subj].folders.push(folderName)
                        layout[row.subj].niftis[folderName] = (lastPath.includes("derivatives") ? '/derivatives/' : '/')
                            + lastPath.slice(/sub-[0-9]*/.exec(lastPath).index)
                        currentMetaData = {}
                        lastFolder = folderName
                    }

                    lastPath = row.file_path
                    currentMetaData[row.entity_name] = row.value.toString() // make sure we preserve leading 0s
                });
                for (let i = 0; i < layout[subjLabel].folders.length; i++) {
                    // find files for each folder
                    const folder = layout[subjLabel].folders[i];
                    try {
                        layout[subjLabel].files[folder] = fs.readdirSync(`${imagePath}/${folder}`)
                    } catch (error) {
                        if (error.code === 'ENOENT') {
                            console.log(`${imagePath}/${folder} not found`)
                            delete layout[subjLabel].files[folder];
                            layout[subjLabel].folders.filter(e => e !== folder)
                        } else {
                            throw error;
                        }
                    }
                }
                ret.push(layout[subjLabel])
                if (--nrow === 0) {
                    ret.sort((a, b) => a.id - b.id)
                    res.send(ret)
                }
            });
        });
    });
}

const completedPages = (res, limit) => {
    let completedSubjects = `SELECT COUNT(DISTINCT _value) AS cnt FROM tags WHERE entity_name = 'subject' AND _value IN (SELECT DISTINCT subject_id FROM reports) ORDER BY _value ASC`
    db.get(completedSubjects, (err, row) => {
        let pagesDone = Math.floor(row.cnt / limit)
        res.send(pagesDone.toString())
    });
}
const todoPages = (res, limit) => {
    let todoSubjects = `SELECT COUNT(DISTINCT _value) AS cnt FROM tags WHERE entity_name = 'subject' AND _value NOT IN (SELECT DISTINCT subject_id FROM reports) ORDER BY _value ASC`
    db.get(todoSubjects, (err, row) => {
        let pagesDone = Math.floor(row.cnt / limit)
        res.send(pagesDone.toString())
    });
}

app.use(express.static(__dirname + '/html'))
app.use(express.static(__dirname + '/node_modules'))
app.use('/papaya', express.static(__dirname + '/Papaya/release/current/minimal'))
app.use(express.static('/usr/src/data/images'))
app.use(express.static('/usr/src/data/nifti'))
app.use(express.json())

app.get("/node_modules*", (req, res) => {
    // let type = mime.getType(req.originalUrl);
    // res.setHeader('Content-Type', type);
    res.sendFile(path.join(__dirname, req.originalUrl))
})

app.get("/api", (req, res) => {
    // res.setHeader('Content-Type', 'application/json');
    if (req.query.action === 'loadSubjects') {
        loadSubjects(res, req.query.page, req.query.limit, req.query.skip_reviewed === '1')
    } else if (req.query.action === 'loadCompletedPages') {
        completedPages(res, req.query.limit)
    }
    else if (req.query.action === 'loadTodoPages') {
        todoPages(res, req.query.limit)
    }
})

app.post('/review', (req, res) => {
    if (req.body.rating === undefined) {
        return res.status(500).json('rating not submitted')
    }
    let sql = `REPLACE INTO reports (subject_id, content, rating, scan) VALUES (${req.body.subj}, '${req.body.textarea}', ${req.body.rating}, '${req.body.folder}')`
    db.run(sql, (err) => {
        if (err) {
            console.log(sql, err)
            res.status(500).json(err)
        } else {
            res.status(200).json('success')
        }
    })
})

app.listen(port, () => {
    console.log(`Starting... http://localhost:${port}`)
    // ensure reports table exists
    db.run('CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, subject_id INTEGER, scan TEXT UNIQUE, content TEXT, rating REAL, sqltime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)')
})
