import Reader from './common/reader';
import strings from '../src/en-us.strings';
import pdf from '../demo/pdf';
import epub from '../demo/epub';
import snapshot from '../demo/snapshot';
import { setCookie, getCookie } from './custom/cookie'
import { putApi, deleteApi } from './custom/utils/apiFetch';

window.dev = true;

let api = '';
if (process.env.NODE_ENV === 'development'){
	api = 'https://be.yeondoo.net'
}
else if (process.env.NODE_ENV === 'production'){
	api = `${process.env.VITE_REACT_APP_AWS_SERVER}`
}

let reader

let chatNoteList = []

const receiveBasicInfo = (e) => {
	if (e.data.workspaceId) {
		sessionStorage.setItem('workspaceId', e.data.workspaceId)
	}
	if (e.data.access) {
		setCookie('access', e.data.access)
	}
	if (e.data.refresh) {
		setCookie('refresh', e.data.refresh)
	}
	if (e.data.paperId && e.data.paperItems) {
		sessionStorage.setItem('paperId', e.data.paperId)
		const paperItemsWithTag = e.data.paperItems.map((paper) => { 
			const changeItem =  {
				...paper,
				tags: [],
				id: paper.itemId,
				type: paper.itemType,
				// dateCreated: "2023-06-19T10:23:38.321Z",
				// dateModified: "2023-06-19T10:23:50.856Z",
				// sortIndex: "00000|001132|00451",
				// authorName: "John",
				// isAuthorNameAuthoritative: true,
			}
			delete changeItem.itemId
			delete changeItem.itemType
			return changeItem})
		sessionStorage.setItem('paperItemsWithTag', JSON.stringify(paperItemsWithTag))
		createReader(e.data.paperId, paperItemsWithTag);
	}
	if (e.data.chatNote) {
		const paperItemsWithTag = JSON.parse(sessionStorage.getItem('paperItemsWithTag'))
		chatNoteList.push(e.data.chatNote)

		reader.updateSettings(e.data.chatNote)
		
		//createReader(paperId, [...paperItemsWithTag, e.data.chatNote])
	}
}

window.addEventListener("message", receiveBasicInfo);

window.parent.postMessage({isPdfRender: true}, '*')
		

async function createReader(paperId, paperItems) {
	if (window._reader) {
		throw new Error('Reader is already initialized');
	}
	let queryString = window.location.search;
	let urlParams = new URLSearchParams(queryString);
	let type = urlParams.get('type') || 'pdf';
	let demo;
	if (type === 'pdf') {
		demo = pdf;
	}
	else if (type === 'epub') {
		demo = epub;
	}
	else if (type === 'snapshot') {
		demo = snapshot;
	}
	let res = await fetch(`https://browse.arxiv.org/pdf/${paperId}.pdf`);
	console.log("hihi",Number(sessionStorage.getItem('workspaceId')))
	// console.log("location!!",window.location)
	// console.log(window.location)
	reader = new Reader({
		type,
		localizedStrings: strings,
		readOnly: false,
		data: {
			buf: new Uint8Array(await res.arrayBuffer()),
			url: new URL('/', window.location).toString()
		},
		// rtl: true,
		annotations: paperItems,
		primaryViewState: demo.state,
		sidebarWidth: 240,
		bottomPlaceholderHeight: 0,
		toolbarPlaceholderWidth: 0,
		authorName: '',
		showAnnotations: true,
		// platform: 'web',
		// password: 'test',
		onOpenContextMenu(params) {
			reader.openContextMenu(params);
		},
		onAddToNote() {
			alert('Add annotations to the current note');
		},
		onSaveAnnotations: function (annotations) {
			const payload = {...annotations[0]}
			delete payload.tags
			delete payload.authorName
			delete payload.isAuthorNameAuthoritative
			delete payload.sortIndex
			delete payload.onlyTextOrComment

			payload.itemType = payload.type
			payload.itemId = payload.id

			delete payload.type
			delete payload.id

			delete annotations.onlyTextOrComment

			const paperId = sessionStorage.getItem('paperId')
			const workspaceId = sessionStorage.getItem('workspaceId')

			putApi(api, `/api/paper/item?paperId=${paperId}&workspaceId=${workspaceId}`, payload)
			.catch(error => {
				console.log(error)
			})
			console.log('Save annotations', annotations);
		},
		onDeleteAnnotations: function (ids) {
			const paperId = sessionStorage.getItem('paperId')
			const workspaceId = sessionStorage.getItem('workspaceId')

			deleteApi(api, `/api/paper/item?paperId=${paperId}&workspaceId=${workspaceId}&itemId=${ids}`)
			console.log('Delete annotations', JSON.stringify(ids));
		},
		onChangeViewState: function (state, primary) {
			console.log('Set state', state, primary);
		},
		onOpenTagsPopup(annotationID, left, top) {
			alert(`Opening Zotero tagbox popup for id: ${annotationID}, left: ${left}, top: ${top}`);
		},
		onClosePopup(data) {
			console.log('onClosePopup', data);
		},
		onOpenLink(url) {
			alert('Navigating to an external link: ' + url);
		},
		onToggleSidebar: (open) => {
			console.log('Sidebar toggled', open);
		},
		onChangeSidebarWidth(width) {
			console.log('Sidebar width changed', width);
		},
		onSetDataTransferAnnotations(dataTransfer, annotations, fromText) {
			console.log('Set formatted dataTransfer annotations', dataTransfer, annotations, fromText);
		},
		onConfirm(title, text, confirmationButtonTitle) {
			return window.confirm(text);
		},
		onRotatePages(pageIndexes, degrees) {
			console.log('Rotating pages', pageIndexes, degrees);
		},
		onDeletePages(pageIndexes, degrees) {
			console.log('Deleting pages', pageIndexes, degrees);
		}
	});
	readers.push(reader);
	reader.enableAddToNote(true);
	window._reader = reader;
	await reader.initializedPromise;
}

// createReader("2310.03740");
