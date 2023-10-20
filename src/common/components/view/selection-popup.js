import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { ANNOTATION_COLORS } from '../../defines';
import ViewPopup from './view-popup';
import CustomSections from '../common/custom-sections';

function SelectionPopup(props) {
	const intl = useIntl();

	function handleColorPick(color) {
		props.onAddAnnotation({ ...props.params.annotation, color });
	}

	// 추가: Push to Chat 버튼 클릭시 드래그한 텍스트 전송
	function handleAddToNote() {
		// props.onAddToNote([props.params.annotation]);
		window.parent.postMessage({selectedText: props.params.annotation.text, position: props.params.annotation.position}, '*')
	}

	return (
		<ViewPopup
			className="selection-popup"
			rect={props.params.rect}
			uniqueRef={{}}
			padding={20}
		>
			<div className="colors" data-tabstop={true}>
				{ANNOTATION_COLORS.map((color, index) => (<button
					key={index}
					tabIndex={-1}
					className="toolbarButton tool-color"
					style={{ color: color[1] }}
					title={intl.formatMessage({ id: color[0] })}
					onClick={() => handleColorPick(color[1])}
				/>))}
			</div>
			{props.enableAddToNote &&
				<div className="wide-button" data-tabstop={true} onClick={handleAddToNote}>
					<FormattedMessage id="pdfReader.addToNote"/>
				</div>}
			<CustomSections type="TextSelectionPopup" annotation={props.params.annotation}/>
		</ViewPopup>
	);
}

export default SelectionPopup;
