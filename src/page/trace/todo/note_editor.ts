import type { Action } from 'svelte/action';

import "quill/dist/quill.core.css";
import Quill, { Range } from "quill";
import { QuillBinding } from "y-quill";
import QuillCursors from "quill-cursors";
import * as Y from "yjs";

export const note: Action<HTMLDivElement, Y.Text> = (node, text) => {
	// the node has been mounted in the DOM
	const editor = new Quill(node, {
		// modules: {
		// 	toolbar: false,
		// },
		// theme: "snow",
		// placeholder: "placeholder",
	});

	const binding = new QuillBinding(text, editor /*, provider.awareness*/);

	return {
		destroy() {
			// the node has been removed from the DOM
		},
	};
};