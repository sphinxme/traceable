import type { Action } from "svelte/action";

import * as Y from "yjs";
import { Editor, type EditorOptions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";

type TiptapActionParams = {
	yDoc: Y.Doc;
	configs?: Partial<EditorOptions>;
	init?: (editor: Editor) => void;
};

export const tiptap: Action<HTMLDivElement, TiptapActionParams> = (
	container,
	{ yDoc, configs, init },
) => {
	const xmlFragment = yDoc.getXmlFragment("default");

	const editor = new Editor({
		element: container,
		extensions: [
			StarterKit.configure({
				document: false,
			}),
			Collaboration.configure({
				fragment: xmlFragment,
			}),
		],
		...configs,
	});

	if (init) {
		init(editor);
	}

	return {
		update(params) {
			if (yDoc !== params.yDoc) {
				yDoc = params.yDoc;
				const newXmlFragment = yDoc.getXmlFragment("default");
				editor.view.dispatch(
					editor.state.tr.setMeta(Collaboration.name, {
						fragment: newXmlFragment,
					}),
				);
			}

			if (configs !== params.configs) {
				editor.destroy();
				const newXmlFragment = yDoc.getXmlFragment("default");
				const newEditor = new Editor({
					element: container,
					extensions: [
						StarterKit.configure({
							document: false,
						}),
						Collaboration.configure({
							fragment: newXmlFragment,
						}),
					],
					...params.configs,
				});
				if (params.init) {
					params.init(newEditor);
				}
			}
		},
		destroy() {
			editor.destroy();
		},
	};
};
