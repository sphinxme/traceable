import type { Action } from "svelte/action";

import * as Y from "yjs";
import Quill, { type QuillOptions } from "quill";

import { QuillBinding } from "y-quill";
// import QuillCursors from "quill-cursors";

type QuillActionParams = {
    text: Y.Text;
    configs?: QuillOptions;
};
export const quill: Action<HTMLDivElement, QuillActionParams> = (
    container,
    { text: yText, configs },
) => {
    const editor = new Quill(container, configs);
    let binding = new QuillBinding(yText, editor /*, provider.awareness*/);
    return {
        destroy() {
            binding.destroy();
        },
    };
};