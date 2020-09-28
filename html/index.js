const electron = require('electron');
const { dialog } = electron.remote;
const { ipcRenderer } = electron;
const uuidv4 = require('uuid').v4;
let page = 0;

document.getElementById('form').addEventListener('submit', (e) => {
    e.preventDefault();
    let formData = {
        jpegs: document.getElementById('jpg_path').getAttribute('value'),
        db: document.getElementById('db').files[0].path,
        page: 0
    }
    ipcRenderer.send('loadLayout', formData);
    document.getElementById('navbar').innerHTML = `<span class="navbar-text text-right w-100 text-light small">Loaded ${document.getElementById('db').files[0].path}</span>`
    e.target.classList.add('d-none')
    document.getElementById('main').classList.remove('d-none')
});
document.getElementById('jpg_path').addEventListener('click', selectDir);

function changePage(direction) {
    page += direction
    document.getElementById('prev').disabled = page === 0
    ipcRenderer.send('loadLayout', {
        jpegs: document.getElementById('jpg_path').getAttribute('value'),
        db: document.getElementById('db').files[0].path,
        page: page
    });
}

function showSession(uuid, folderIndex, sesIndex) {
    subjButton = document.getElementById(`subject-button-${uuid}`)
    sesButton = document.getElementById(`session-button-${uuid}-${folderIndex}`)
    paneDiv = document.getElementById(`pane-${uuid}-${folderIndex}`)
    paneButton = document.getElementById(`pane-button-${uuid}-${folderIndex}`)
    paneButtons = document.getElementsByClassName(`pane-button-${uuid}-${sesIndex}`)
    sesButtons = document.getElementsByClassName(`session-button-${uuid}`)
    showPane(paneButton, paneButtons, paneDiv)
    Array.from(document.getElementsByClassName('subject-button')).forEach(button => button.classList.remove('active'))
    Array.from(document.getElementsByClassName('session-button')).forEach(button => button.classList.remove('active'))
    Array.from(document.getElementsByClassName('session-button')).forEach(button => button.classList.add('d-none'))
    Array.from(sesButtons).forEach(button => button.classList.remove('d-none'))
    sesButton.classList.add('active')
    subjButton.classList.add('active')
}

function showPane(paneButton, paneButtons, paneDiv) {
    Array.from(document.getElementsByClassName('content-pane')).forEach(pane => pane.classList.add('d-none'))
    Array.from(document.getElementsByClassName('pane-button')).forEach(pane => pane.classList.remove('active'))
    Array.from(document.getElementsByClassName('pane-button')).forEach(pane => pane.classList.add('d-none'))
    Array.from(paneButtons).forEach(pane => pane.classList.remove('d-none'))
    paneDiv.classList.remove('d-none')
    paneButton.classList.add('active')
}

function submitReport(e, subj, folder) {
    e.preventDefault();
    let formData = {
        subj: subj,
        folder: folder,
        rating: document.getElementById(`rating-${folder}`).value,
        textarea: document.getElementById(`textarea-${folder}`).value
    }
    ipcRenderer.send('report', formData);
}

function selectDir(e) {
    e.preventDefault();
    const id = e.target.id;
    const path = dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    path.then(values => {
        if (values.filePaths[0] !== undefined) {
            e.target.classList = 'is-valid custom-file-input';
            document.querySelectorAll('[for="' + id + '"]')[0].style.borderColor = '#28a745'
            document.getElementById(id + '-help').innerText = 'You selected ' + values.filePaths[0];
            document.getElementById(id).setAttribute('value', values.filePaths[0]);
        } else {
            e.target.classList = 'is-invalid custom-file-input';
            document.getElementById(id + '-help').innerText = 'You didn\'t select anything';
            document.querySelectorAll('[for="' + id + '"]')[0].style.borderColor = '#dc3545'
            document.getElementById(id).setAttribute('value', '');
        }
    });
}

ipcRenderer.on('add-subject', (event, subj) => {
    let uuid = uuidv4();
    document.getElementById('subject-list').innerHTML += `<a class="nav-item nav-link subject-button" id="subject-button-${uuid}" onclick="showSession('${uuid}', 0, '01')">sub-${subj.id}</a>`
    let modalityDisplay = document.getElementById('modality-list').innerHTML == '' ? '' : 'd-none';
    let modalityList = document.getElementById('modality-list').innerHTML
    let contentList = document.getElementById('content-list').innerHTML
    let lastSession = null;
    subj.folders.sort()
    subj.folders.forEach((folder, i) => {
        let thisSession = folder.match(/[_/\\]+ses-([a-zA-Z0-9]+)/)[1]
        if (lastSession !== thisSession) {
            document.getElementById('session-list').innerHTML += `<a class="nav-item nav-link session-button session-button-${uuid}" id="session-button-${uuid}-${i}" onclick="showSession('${uuid}', ${i}, '${thisSession}')">ses-${thisSession}</a>`
            lastSession = thisSession
        }
        if (subj.report[folder] === undefined) {
            subj.report[folder] = {
                rating: 0,
                content: ''
            }
        }
        let reportForm = `<form onsubmit="submitReport(event, '${subj.id}', '${folder}')">
        <div class="form-group">
            <label for="rating-${folder}">Rating</label>
            <input type="range" class="custom-range" id="rating-${folder}" min="0" max="100" value="${subj.report[folder].rating}">
        </div>
        <div class="form-group">
            <label for="textarea-${folder}">Comments</label>
            <textarea class="form-control" id="textarea-${folder}" rows="3">${subj.report[folder].content}</textarea>
        </div>
        <div class="form-group">
            <button type="submit" class="btn btn-primary">Submit</button>
        </div></form>`
        let folderLabel = folder.split("_").splice(2).join(" ")
        modalityList += `<button type="button" class="btn btn-outline-secondary pane-button pane-button-${uuid}-${thisSession} ${modalityDisplay}" id="pane-button-${uuid}-${i}" onclick="showPane(event.target, document.getElementsByClassName('pane-button-${uuid}-${thisSession}'), document.getElementById('pane-${uuid}-${i}'))">${folderLabel}</button>`
        contentList += `<div class="content-pane container-fluid ${i === 0 ? '' : 'd-none'}" id="pane-${uuid}-${i}">${reportForm}<div class="row">`
        if (subj.files[folder] === undefined) {
            contentList += `<p class="text-danger">${folder} could not be found!</p>`
        } else {
            let lowerLimit = Math.round(subj.files[folder].length * 0.2);
            let upperLimit = subj.files[folder].length - lowerLimit;
            subj.files[folder].forEach((file, i) => {
                if (i > lowerLimit && i < upperLimit) {
                    contentList += `<div class="col-1 m-0 p-0"><img alt="${folder}" class="p-0 m-0 img-fluid" src="file://${document.getElementById('jpg_path').getAttribute('value')}/${folder}/${file}" /></div>`    
                }
                
            })
        }
        contentList += '</div></div>'
    });
    document.getElementById('modality-list').innerHTML = modalityList;
    document.getElementById('content-list').innerHTML = contentList;
})