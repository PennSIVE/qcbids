const electron = require('electron');
const { ipcRenderer } = electron;
let page = 0;

document.getElementById('form').addEventListener('submit', (e) => {
    e.preventDefault();
    let formData = {
        jpegs: document.getElementById('jpg_path').value,
        db: document.getElementById('db').files[0].path,
        page: 0
    }
    ipcRenderer.send('loadLayout', formData);
    document.getElementById('navbar').innerHTML = `<span class="navbar-text text-right w-100 text-light small">Loaded ${document.getElementById('db').files[0].path}</span>`
    e.target.classList.add('d-none')
    document.getElementById('main').classList.remove('d-none')
});

function changePage(direction) {
    page += direction
    document.getElementById('prev').disabled = page === 0
    ipcRenderer.send('loadLayout', {
        jpegs: document.getElementById('jpg_path').value,
        db: document.getElementById('db').files[0].path,
        page: page
    });
}

function showSubject(e, pane, button) {
    Array.from(document.getElementsByClassName('content-pane')).forEach(pane => pane.classList.add('d-none'))
    Array.from(document.getElementsByClassName('modality-button')).forEach(pane => pane.classList.add('d-none'))
    Array.from(document.getElementsByClassName(button)).forEach(button => button.classList.remove('d-none'))
    Array.from(document.getElementsByClassName('subject-button')).forEach(pane => pane.classList.remove('active'))
    document.getElementById(pane).classList.remove('d-none')
    e.target.classList.add('active')
}

function showPane(e, paneDiv) {
    Array.from(document.getElementsByClassName('content-pane')).forEach(pane => pane.classList.add('d-none'))
    Array.from(document.getElementsByClassName('modality-button')).forEach(pane => pane.classList.remove('active'))
    document.getElementById(paneDiv).classList.remove('d-none')
    e.target.classList.add('active')
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

ipcRenderer.on('add-subject', (event, subj) => {
    document.getElementById('subject-list').innerHTML += `<a class="nav-item nav-link subject-button" onclick="showSubject(event, 'pane-${subj.folders[0]}', 'button-${subj.id}')">sub-${subj.id}</a>`
    let modalityDisplay = document.getElementById('modality-list').innerHTML == '' ? '' : 'd-none';
    let modalityList = document.getElementById('modality-list').innerHTML
    let contentList = document.getElementById('content-list').innerHTML
    subj.folders.forEach((folder, i) => {
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
        modalityList += `<button type="button" class="btn btn-outline-secondary modality-button button-${subj.id} ${modalityDisplay}" onclick="showPane(event, 'pane-${folder}')">${folder}</button>`
        contentList += `<div class="content-pane container-fluid ${i === 0 ? '' : 'd-none'}" id="pane-${folder}">${reportForm}<div class="row">`
        subj.files[folder].forEach((file) => { contentList += `<div class="col-1 m-0 p-0"><img alt="${folder}" class="p-0 m-0 img-fluid" src="file://${document.getElementById('jpg_path').value}/${folder}/${file}" /></div>` })
        contentList += '</div></div>'
    });
    document.getElementById('modality-list').innerHTML = modalityList;
    document.getElementById('content-list').innerHTML = contentList;
})