const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require("electron-updater")
const fs = require('fs')
const sqlite3 = require('sqlite3')
const MAX_SUBJECTS = 10;
let win = undefined
let db = undefined

function loadLayout(dbFile, imagePath, page = 0, skip_reviewed = true) {
    let layout = {}
    db = new sqlite3.Database(dbFile)

    // ensure reports table exists
    db.run(`CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER, scan TEXT, content TEXT, rating REAL);`)

    let offset = page * MAX_SUBJECTS
    let subjects = (skip_reviewed) ?
        `SELECT value FROM
            (SELECT DISTINCT _value AS value, COUNT(*) AS num_subj_images,
                (SELECT COUNT(*) AS cnt FROM reports WHERE subject_id = CAST(_value AS INT)) AS num_subj_reports
            FROM tags WHERE entity_name = 'subject' GROUP BY _value)
            WHERE num_subj_images != num_subj_reports ORDER BY value ASC LIMIT ${MAX_SUBJECTS} OFFSET ${offset}` :
        `SELECT DISTINCT _value AS value FROM tags WHERE entity_name = 'subject' ORDER BY _value ASC LIMIT ${MAX_SUBJECTS} OFFSET ${offset}`

    db.all(subjects, [], (err, rows) => {
        if (err) throw err;

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
                report: {}
            }

            db.all(`SELECT content, rating, scan, '${subjLabel}' AS subj FROM reports WHERE subject_id = ${subjLabel}`, [], (err, rows) => {
                if (err) throw err;
                rows.forEach((row) => {
                    layout[row.subj].report[row.scan] = {
                        content: row.content,
                        rating: row.rating
                    }
                })
            })

            let lastPath = undefined;
            let currentMetaData = {};
            db.all(sql, [], (err, rows) => {
                if (err) throw err;
                rows.forEach((row, i) => {
                    // for each subject tag
                    if (lastPath !== row.file_path && Object.keys(currentMetaData).length > 0) {
                        // we've gotten to a new file, push old
                        layout[row.subj].folders.push(BIDSname(currentMetaData))
                        currentMetaData = {}
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
                win.webContents.send('add-subject', layout[subjLabel]);
            });
        });
    });

}

function BIDSname(metaData) {
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

function saveReport(id, content, rating, scan) {
    db.run(`INSERT INTO reports (subject_id, content, rating, scan) VALUES (${id}, '${content}', ${rating}, '${scan}')`)
}

function page(page) {

}

function init() {
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();
}

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 1000,
        height: 800,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            nodeIntegration: true
        }
    })

    // and load the index.html of the app.
    win.loadFile('html/index.html')

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(init)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})



ipcMain.on('loadLayout', (event, args) => {
    loadLayout(args.db, args.jpegs, args.page)
});

ipcMain.on('report', (event, args) => {
    console.log(args);
    saveReport(args.subj, args.textarea, args.rating, args.folder)
});
