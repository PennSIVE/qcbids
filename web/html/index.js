const params = new URLSearchParams(window.location.search)
const page = params.get('page') || 0
const jpg_root = window.location.pathname

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
const getJSON = (url, callback) => {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'json'
    xhr.onload = () => {
        var status = xhr.status
        if (status === 200) {
            callback(null, xhr.response)
        } else {
            callback(status, xhr.response)
        }
    }
    xhr.send()
}


function changePage(direction) {
    window.location.href = window.location.pathname+"?page=" + (Number(page) + Number(direction))
}

function showSession(uuid, folderIndex, sesIndex) {
    subjButton = document.getElementById(`subject-button-${uuid}`)
    sesButton = document.getElementById(`session-button-${uuid}-${folderIndex}`)
    paneDiv = document.getElementById(`pane-${uuid}-${folderIndex}`)
    console.log(`pane-${uuid}-${folderIndex}`)
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
    let rating = undefined
    Array.from(document.getElementById(`rating-${folder}`).children).forEach(child => {
        if (child.classList.contains('active')) {
            rating = child.dataset.rating
        }
    })
    let formData = {
        subj: subj,
        folder: folder,
        rating: rating,
        textarea: document.getElementById(`textarea-${folder}`).value
    }
    ipcRenderer.send('report', formData);
}


const addSubjectToDom = (subj) => {
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
                rating: -1,
                content: ''
            }
        }
        let reportForm = `<form onsubmit="submitReport(event, '${subj.id}', '${folder}')">
        <div class="form-group">
            <label for="rating-${folder}">Rating</label>
            <div class="btn-group" role="group" aria-label="Rating" id="rating-${folder}">
                <button type="button" data-rating="0" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active')" class="btn btn-outline-danger ${subj.report[folder].rating == 0 ? 'active' : ''}">Awful</button>
                <button type="button" data-rating="25" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active')" class="btn btn-outline-warning ${subj.report[folder].rating == 25 ? 'active' : ''}">Bad</button>
                <button type="button" data-rating="50" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active')" class="btn btn-outline-secondary ${subj.report[folder].rating == 50 ? 'active' : ''}">Ok</button>
                <button type="button" data-rating="75" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active')" class="btn btn-outline-primary ${subj.report[folder].rating == 75 ? 'active' : ''}">Good</button>
                <button type="button" data-rating="100" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active')" class="btn btn-outline-success ${subj.report[folder].rating == 100 ? 'active' : ''}">Great</button>
            </div>
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
        contentList += `<div class="content-pane container-fluid ${i === 0 ? '' : 'd-none'}" id="pane-${uuid}-${i}">${reportForm}`
        let contentListInner = '<div class="row position-relative" style="z-index:-1">'
        if (subj.files[folder] === undefined) {
            contentListInner += `<p class="text-danger">${folder} could not be found!</p>`
        } else {
            let lowerLimit = subj.files[folder].length * 0.3;
            let upperLimit = subj.files[folder].length * 0.8;
            let overlaySliders = new Set();
            let defaultComplement = undefined
            // todo this is ugly
            let base = folder.split("_").splice(0, 3).join("_")
            for (let i = 0; i < subj.folders.length; i++) {
                if (subj.folders[i].includes(base) && subj.folders[i].includes('brain')) {
                    defaultComplement = subj.folders[i]
                    break
                }
            }
            subj.files[folder].forEach((file, i) => {
                if (i > lowerLimit && i < upperLimit) {
                    if (folder.includes('mimosa') || folder.includes('thalamus')) {
                        contentListInner += `<div class="col-1 m-0 p-0">
                                            <img alt="${folder}" class="underlay-${folder} p-0 m-0 img-fluid" src="${jpg_root}${defaultComplement}/${file}" />
                                            <img alt="${folder}" class="overlay-${folder} p-0 m-0 img-fluid position-absolute" src="${jpg_root}${folder}/${file}" style="opacity: 0.5;height:auto;width:100%;top:0;left:0;" />
                                        </div>`
                        overlaySliders.add(folder);
                    } else {
                        contentListInner += `<div class="col-1 m-0 p-0"><img alt="${folder}" class="p-0 m-0 img-fluid" src="${jpg_root}${folder}/${file}" /></div>`
                    }
                }

            })
            overlaySliders.forEach((id, i) => {
                let dropdownOptions = subj.folders.filter(x => x.includes(folder.split("_").splice(0, 3).join("_"))).map(x => `<a class="dropdown-item" href="#" onclick="toggleBackground('${x}', '${id}', Math.round(${subj.files[x].length} * 0.3))">${x}</a>`)
                contentList += `<form class="position-sticky">
                <div class="form-group">
                    <div class="dropdown">
                        <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        Background brain
                        </button>
                        <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                            ${dropdownOptions}
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="overlay-slider-${i}">Opacity</label>
                    <input type="range" onchange="pct = (this.value / 100); Array.from(document.getElementsByClassName('overlay-${id}')).forEach(el => el.style.opacity = pct)" class="custom-range" id="overlay-slider-${i}" min="0" max="100" value="50">
                </div></form>`
            })
        }
        contentListInner += '</div>'
        contentList += contentListInner + '</div>'
    });
    document.getElementById('modality-list').innerHTML = modalityList;
    document.getElementById('content-list').innerHTML = contentList;
}

const loadSubjects = () => {
    getJSON('/api?' + new URLSearchParams({
        page: page,
        limit: 10
    }), (err, data) => {
        if (err === null) {
            data.forEach(s => addSubjectToDom(s))
        }
    })
}
loadSubjects()
