import Reader from './common/reader';
import strings from '../src/en-us.strings';
import pdf from '../demo/pdf';
import epub from '../demo/epub';
import snapshot from '../demo/snapshot';
import { setCookie, getCookie } from './custom/cookie'
import { putApi, deleteApi } from './custom/utils/apiFetch';
import { getSortIndex } from './pdf/selection';

window.dev = true;

// 추가: api 연결
let api = '';
if (process.env.NODE_ENV === 'development'){
	api = 'https://be.yeondoo.net'
	// api = 'https://virtserver.swaggerhub.com/SYLEELSW_1/Yeondoo/2.0'
}
else if (process.env.NODE_ENV === 'production'){
	api = `${process.env.VITE_REACT_APP_AWS_SERVER}`
}

let reader

let chatNoteList = []

// 추가: iframe 연동
const receiveBasicInfo = async(e) => {
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
		if (window._reader) {
			let res;
			if (e.data.userPdf) {
				res = await fetch(`https://yeondoo-upload-pdf.s3.ap-northeast-2.amazonaws.com/${e.data.paperId}.pdf`);
			} else {
				res = await fetch(`https://browse.arxiv.org/pdf/${e.data.paperId}.pdf`);
			}
			const newData = {
				buf: new Uint8Array(await res.arrayBuffer()),
				url: new URL('/', window.location).toString()
			}
			await reader.changePaper(paperItemsWithTag)
			await reader.reload(newData)
			window.parent.postMessage({isUpdatedDone: true}, '*')
		} else {
			createReader(e.data.paperId, paperItemsWithTag, e.data.userPdf);
			// window.parent.postMessage({createReader: true}, '*')
		}
	}
	else if (e.data.chatNote) {
		const paperItemsWithTag = JSON.parse(sessionStorage.getItem('paperItemsWithTag'))
		const payload = {
			...e.data.chatNote,
			sortIndex: getSortIndex(reader._primaryView._pdfPages, e.data.chatNote.position)
		}
		chatNoteList.push(payload)

		reader.updateSettings(payload)
		
		//createReader(paperId, [...paperItemsWithTag, e.data.chatNote])
	}
	else if (e.data.isExportClicked) {
		const annotations = reader._state.annotations
		window.parent.postMessage({annotations: annotations}, '*')
	}
	else if (e.data.isDownloadPdfClicked) {
		const annotations = reader._state.annotations
		window.parent.postMessage({pdfAnnotations: annotations}, '*')
	}
	else if (e.data.proof) {
		const proofId = e.data.proofId
		const payload = {
			...e.data.proof,
			sortIndex: getSortIndex(reader._primaryView._pdfPages, e.data.proof.position),
			noPreview: true
		}
		reader.updateSettings(payload)
		reader.deletePaperProof([proofId])
		reader.setSelectedAnnotations([e.data.proof.id])
	}
}

window.addEventListener("message", receiveBasicInfo);

window.parent.postMessage({isPdfRender: true}, '*')
		
// 변경: createReader 파라미터 추가
async function createReader(paperId, paperItems, userPdf) {
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
	// 변경: pdf 주소 받기
	let res;
	if (userPdf) {
		res = await fetch(`https://yeondoo-upload-pdf.s3.ap-northeast-2.amazonaws.com/${paperId}.pdf`)
	} else {
		res = await fetch(`https://browse.arxiv.org/pdf/${paperId}.pdf`);
	}
	
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
		// 추가: save시 put api 호출
		onSaveAnnotations: function (annotations) {
			const payload = {...annotations[0]}
			delete payload.tags
			delete payload.authorName
			delete payload.isAuthorNameAuthoritative
			//delete payload.sortIndex
			delete payload.onlyTextOrComment

			payload.itemType = payload.type
			payload.itemId = payload.id

			delete payload.type
			delete payload.id

			delete annotations.onlyTextOrComment

			const paperId = sessionStorage.getItem('paperId')
			const workspaceId = sessionStorage.getItem('workspaceId')

			//refresh api 넣기
			putApi(api, `/api/paper/item?paperId=${paperId}&workspaceId=${workspaceId}`, payload)
			.catch(error => {
				console.log(error)
			})
			console.log('Save annotations', annotations);
		},
		// 추가: 삭제 시 delete api 호출
		onDeleteAnnotations: function (ids) {
			const paperId = sessionStorage.getItem('paperId')
			const workspaceId = sessionStorage.getItem('workspaceId')

			//refresh api 넣기
			deleteApi(api, `/api/paper/item?paperId=${paperId}&workspaceId=${workspaceId}&itemId=${ids}`)
			console.log('Delete annotations', JSON.stringify(ids));
		},
		// 추가: view가 업데이트 될 때마다 pageIndex 보내주기
		onChangeViewState: function (state, primary) {
			if (state){
				window.parent.postMessage({pageIndex: state.pageIndex}, '*')
			}
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
	window.parent.postMessage({createReader: true}, '*')

	reader.enableAddToNote(true);
	window._reader = reader;
	await reader.initializedPromise;
}

// createReader("2310.03740");
