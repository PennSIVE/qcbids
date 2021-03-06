const page = Number(new URLSearchParams(window.location.search).get('page')) || 0
const skip_reviewed = Number(new URLSearchParams(window.location.search).get('skip_reviewed')) || 1
let per_page = Number(new URLSearchParams(window.location.search).get('per_page')) || 10
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
    window.location.href = window.location.pathname + "?page=" + (page + Number(direction)) + '&per_page=' + per_page
}

function toggleBackground(targetFolderId, clickedFolderId, start) {
    Array.from(document.getElementsByClassName(`underlay-${clickedFolderId.replace('.', '')}`)).forEach((img, i) => img.src = `http://${window.location.host}/${targetFolderId}/output-slice${(i + start).toString().padStart(3, '0')}.jpg`)
}

function showSession(uuid, folderIndex, sesIndex, folder) {
    let subjButton = document.getElementById(`subject-button-${uuid}`)
    let sesButton = document.getElementById(`session-button-${uuid}-${folderIndex}`)
    let paneDiv = document.getElementById(`pane-${uuid}-${folderIndex}`)
    let paneButton = document.getElementById(`pane-button-${uuid}-${folderIndex}`)
    let paneButtons = document.getElementsByClassName(`pane-button-${uuid}-${sesIndex}`)
    let sesButtons = document.getElementsByClassName(`session-button-${uuid}`)
    let navbarContainer = document.getElementById(`${uuid}-navbar-content`)
    let niftiButton = document.getElementById(`${uuid}-${folderIndex}-nifti-btn`)
    let controls = document.getElementById(`${uuid}-${folder}-controls`)
    showPane(paneButton, paneButtons, paneDiv, navbarContainer, niftiButton, controls)
    Array.from(document.getElementsByClassName('subject-button')).forEach(button => button.classList.remove('active'))
    Array.from(document.getElementsByClassName('session-button')).forEach(button => button.classList.remove('active'))
    Array.from(document.getElementsByClassName('session-button')).forEach(button => button.classList.add('d-none'))
    Array.from(sesButtons).forEach(button => button.classList.remove('d-none'))
    sesButton.classList.add('active')
    subjButton.classList.add('active')
}

function showPane(paneButton, paneButtons, paneDiv, navbarContainer, niftiButton, controls) {
    Array.from(document.getElementsByClassName('content-pane')).forEach(x => x.classList.add('d-none'))
    Array.from(document.getElementsByClassName('pane-button')).forEach(x => x.classList.remove('active'))
    Array.from(document.getElementsByClassName('pane-button')).forEach(x => x.classList.add('d-none'))
    Array.from(document.getElementsByClassName('navbar-content')).forEach(x => x.classList.add('d-none'))
    Array.from(document.getElementsByClassName('nifti-btn')).forEach(x => x.classList.add('d-none'))
    Array.from(document.getElementsByClassName('overlay-slider')).forEach(x => x.classList.add('d-none'))
    Array.from(paneButtons).forEach(pane => pane.classList.remove('d-none'))
    paneDiv.classList.remove('d-none')
    paneButton.classList.add('active')
    navbarContainer.classList.remove('d-none')
    niftiButton.classList.remove('d-none')
    if (controls != null) {
        controls.classList.remove('d-none')
    }
}

function submitReport(e, subj, folder) {
    if (e !== undefined) {
        e.preventDefault();
    }
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
    fetch("/review", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    }).then(res => {
        document.getElementById(`textarea-${folder}`).classList.add((res.status === 200) ? 'is-valid' : 'is-invalid')
    });
}


const addSubjectToDom = (subj, subjIndex) => {
    if (subj.folders.length === 0) {
        return;
    }
    subj.folders.sort()
    let uuid = uuidv4()
    let firstSession = subj.folders[0].match(/[_/\\]+ses-([a-zA-Z0-9]+)/)[1]
    document.getElementById('subject-list').innerHTML += `<a class="nav-item nav-link subject-button" id="subject-button-${uuid}" onclick="showSession('${uuid}', 0, '${firstSession}', '${subj.folders[0].replace('.', '')}')">sub-${subj.id}</a>`
    let modalityDisplay = document.getElementById('modality-list').innerHTML == '' ? '' : 'd-none';
    let modalityList = document.getElementById('modality-list').innerHTML
    let contentList = document.getElementById('content-list').innerHTML
    let navbarContent = '';
    let lastSession = null;
    let firstPane = undefined
    subj.folders.forEach((folder, i) => {
        let thisSession = folder.match(/[_/\\]+ses-([a-zA-Z0-9]+)/)[1]
        if (firstPane === undefined) {
            firstPane = uuid
        }
        if (lastSession !== thisSession) {
            document.getElementById('session-list').innerHTML += `<a class="nav-item bg-dark text-light nav-link session-button session-button-${uuid}" id="session-button-${uuid}-${i}" onclick="showSession('${uuid}', ${i}, '${thisSession}', '${subj.folders[0].replace('.', '')}')">ses-${thisSession}</a>`
            lastSession = thisSession
        }
        if (subj.report[folder] === undefined) {
            subj.report[folder] = {
                rating: -1,
                content: ''
            }
        }
        let reportForm = `<form class="pb-2" onsubmit="submitReport(event, '${subj.id}', '${folder}')">
        <div class="form-group">
            <label for="rating-${folder}">Rating</label>
            <div class="btn-group" role="group" aria-label="Rating" id="rating-${folder}">
                <button type="button" data-rating="0" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active'); submitReport(undefined, '${subj.id}', '${folder}')" class="btn btn-outline-danger ${subj.report[folder].rating == 0 ? 'active' : ''}">Awful</button>
                <button type="button" data-rating="25" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active'); submitReport(undefined, '${subj.id}', '${folder}')" class="btn btn-outline-warning ${subj.report[folder].rating == 25 ? 'active' : ''}">Bad</button>
                <button type="button" data-rating="50" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active'); submitReport(undefined, '${subj.id}', '${folder}')" class="btn btn-outline-secondary ${subj.report[folder].rating == 50 ? 'active' : ''}">Ok</button>
                <button type="button" data-rating="75" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active'); submitReport(undefined, '${subj.id}', '${folder}')" class="btn btn-outline-primary ${subj.report[folder].rating == 75 ? 'active' : ''}">Good</button>
                <button type="button" data-rating="100" onclick="Array.from(this.parentElement.children).forEach(e => e.classList.remove('active')); this.classList.add('active'); submitReport(undefined, '${subj.id}', '${folder}')" class="btn btn-outline-success ${subj.report[folder].rating == 100 ? 'active' : ''}">Great</button>
            </div>
        </div>
        <div class="form-group">
            <label for="textarea-${folder}">Comments</label>
            <textarea class="form-control bg-dark text-light" id="textarea-${folder}" rows="3">${subj.report[folder].content}</textarea>
        </div>
        <div class="form-group mt-2">
            <button type="submit" class="btn btn-primary">Submit</button>
        </div></form>`
        let folderLabel = folder.split("_").splice(2).join(" ")
        modalityList += `<button type="button" class="btn btn-outline-secondary btn-sm pane-button pane-button-${uuid}-${thisSession} ${modalityDisplay}" id="pane-button-${uuid}-${i}" onclick="showPane(event.target, document.getElementsByClassName('pane-button-${uuid}-${thisSession}'), document.getElementById('pane-${uuid}-${i}'), document.getElementById('${uuid}-navbar-content'), document.getElementById('${uuid}-${i}-nifti-btn'), document.getElementById('${uuid}-${folder.replace('.', '')}-controls'))">${folderLabel}${subj.report[folder].rating === -1 ? '' : ' &#10003;'}</button>`
        contentList += `<div class="content-pane ${i === 0 ? '' : 'd-none'}" id="pane-${uuid}-${i}">${reportForm}`
        let contentListInner = '<div class="row position-relative" style="z-index:-1">'

        let defaultComplement = undefined
        // todo this is ugly
        let base = folder.split("_").splice(0, 3).join("_")
        for (let j = 0; j < subj.folders.length; j++) {
            if (subj.folders[j].includes(base) && subj.folders[j].includes('brain') &&
                ((folder.includes('mimosa') && subj.folders[j].toLowerCase().includes('flair')) || (subj.folders[j].toLowerCase().includes('t1')))) {
                defaultComplement = subj.folders[j]
                break
            }
        }
        let isSegmentation = false
        if (folder.includes('mimosa') || folder.includes('fast') || folder.includes('thalamus')) { // more hardcoding...
            isSegmentation = true
        }
        let openAsNifti = `<a target="_blank" href="/viewer.html?url${isSegmentation ? '2' : ''}=${encodeURIComponent(subj.niftis[folder])}${isSegmentation ? '&url=' + encodeURIComponent('/derivatives/' + defaultComplement.replace("_ses-", "/ses-").replace("_run-", "/run-").replace("_", "/") + '.nii.gz') : ''}" class="btn btn-light d-none nifti-btn" id="${uuid}-${i}-nifti-btn">Open Nifti</button>`
        navbarContent += openAsNifti

        if (subj.files[folder] === undefined) {
            contentListInner += `<p class="text-danger">${folder} could not be found!</p>`
        } else {
            let lowerLimit = subj.files[folder].length * 0.3;
            let upperLimit = subj.files[folder].length * 0.8;
            let overlaySliders = new Set();
            subj.files[folder].forEach((file, j) => {
                if (j > lowerLimit && j < upperLimit) {
                    if (isSegmentation) {
                        contentListInner += `<div class="col-1 m-0 p-0 position-relative">
                                                <img alt="${folder}" class="underlay-${folder.replace('.', '')} p-0 m-0 img-fluid" src="${jpg_root}${defaultComplement}/${file}" />
                                                <img alt="${folder}" class="overlay-${folder.replace('.', '')} p-0 m-0 img-fluid position-absolute" src="${jpg_root}${folder}/${file}" style="opacity: 0.5;height:auto;width:100%;top:0;left:0;filter: sepia(100%) saturate(1000%) brightness(100%) hue-rotate(50deg);" />
                                            </div>`
                        overlaySliders.add(folder);
                    } else {
                        contentListInner += `<div class="col-1 m-0 p-0"><img alt="${folder}" class="p-0 m-0 img-fluid" src="${jpg_root}${folder}/${file}" /></div>`
                    }
                }

            })
            Array.from(overlaySliders).forEach((id, j) => {
                let dropdownOptions = subj.folders.filter(x => x.includes(folder.split("_").splice(0, 3).join("_"))).map(x => `<a class="dropdown-item rounded-0 ${x == defaultComplement ? 'active' : ''}" href="#" onclick="toggleBackground('${x}', '${id}', Math.round(${subj.files[x] === undefined ? 0 : subj.files[x].length} * 0.3))">${x.split('_').splice(2).reverse().join(' ')}</a>`).join('')
                navbarContent = `<form class="d-flex d-none overlay-slider pt-1" id="${uuid}-${id.replace('.', '')}-controls">
                        <div class="dropdown mr-3 ml-2">
                            <button class="btn btn-light dropdown-toggle" type="button" id="dropdownMenuButton-${id.replace('.', '')}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            Background brain
                            </button>
                            <div class="dropdown-menu dropdown-menu-dark" aria-labelledby="dropdownMenuButton-${id.replace('.', '')}">
                                ${dropdownOptions}
                            </div>
                        </div>
                        <label for="overlay-slider-${id.replace('.', '')}">Opacity</label>
                        <input type="range" style="width: 30vw" oninput="pct = (this.value / 100); Array.from(document.getElementsByClassName('overlay-${id.replace('.', '')}')).forEach(el => el.style.opacity = pct)" class="form-range ml-1 mr-2" id="overlay-slider-${id.replace('.', '')}" min="0" max="100" value="50">
                    </form>` + navbarContent
            })
        }
        contentListInner += '</div>'
        contentList += contentListInner + '</div>'
    });
    document.getElementById('modality-list').innerHTML = modalityList;
    document.getElementById('content-list').innerHTML = contentList;
    document.getElementById('navbar-content').innerHTML += `<div class="d-flex d-none navbar-content" id="${uuid}-navbar-content">${navbarContent}</div>`
    if (subjIndex === per_page - 1) {
        showSession(firstPane, 0, firstSession, subj.folders[0].replace('.', ''))
        // start loading less important things
        loadCompletedPages(per_page)
        loadTodoPages(per_page)
    }
}

const setPerPage = () => {
    let select = document.getElementById('select_per_page')
    let options = select.innerHTML
    for (let i = 1; i <= 20; i++) {
        options += `<option value="${i}"${per_page == i ? ' selected' : ''}>${i}</option>`
    }
    select.innerHTML = options
    select.onchange = (e) => {
        per_page = Number(e.target.value)
        changePage(0)
    }
}
const loadSubjects = () => {
    getJSON('/api?' + new URLSearchParams({
        page: page,
        limit: per_page,
        action: 'loadSubjects',
        skip_reviewed: skip_reviewed
    }), (err, data) => {
        if (err === null) {
            data.forEach((s, i) => addSubjectToDom(s, i))
            document.getElementById('loader').classList.add('d-none')
            if (data.length === 0) {
                alert("No subjects left to review")
            }
        } else {
            console.log(err, data)
        }
    })
}
const loadCompletedPages = (per_page) => {
    getJSON('/api?' + new URLSearchParams({
        limit: per_page,
        action: 'loadCompletedPages'
    }), (err, count) => {
        if (err === null) {
            let dropdown = document.getElementById('completedPagesDropdown-content')
            for (let i = 1; i <= count; i++) {
                dropdown.innerHTML += `<a class="dropdown-item rounded-0 ${(!skip_reviewed && page === i) ? 'active' : ''}" href="${window.location.pathname}?page=${i}&per_page=${per_page}&skip_reviewed=0">page ${i}</a>`
            }
        } else {
            console.log(err, count)
        }
    })
}
const loadTodoPages = (per_page) => {
    getJSON('/api?' + new URLSearchParams({
        limit: per_page,
        action: 'loadTodoPages'
    }), (err, count) => {
        if (err === null) {
            let dropdown = document.getElementById('todoPagesDropdown-content')
            for (let i = 1; i <= count; i++) {
                dropdown.innerHTML += `<a class="dropdown-item rounded-0 ${(skip_reviewed && page === i) ? 'active' : ''}" href="${window.location.pathname}?page=${i}&per_page=${per_page}&skip_reviewed=1">page ${i}</a>`
            }
        } else {
            console.log(err, count)
        }
    })
}
setPerPage()
loadSubjects()
