import type { Action } from "svelte/action";

import * as Y from "yjs";
import Quill, { type QuillOptions } from "quill";

import { QuillBinding } from "y-quill";
// import QuillCursors from "quill-cursors";

type QuillActionParams = {
    text?: Y.Text;
    configs?: QuillOptions;
    init?: (editor: Quill) => void;
};
export const quill: Action<HTMLDivElement, QuillActionParams> = (
    container,
    { text: yText, configs, init },
) => {
    let editor = new Quill(container, configs);
    let binding: QuillBinding | undefined;
    if (yText) {
        binding = new QuillBinding(yText, editor /*, provider.awareness*/);
    }

    if (init) {
        init(editor);
    }
    return {
        update(params) {
            if (yText != params.text) {
                console.log("updating quill");
                yText = params.text;
                if (binding) {
                    binding.destroy();
                }
                if (yText) {
                    binding = new QuillBinding(
                        yText,
                        editor, /*, provider.awareness*/
                    );
                }
            }

            if (configs != params.configs) {
                configs = params.configs;
                editor = new Quill(container, configs);
                init = params.init;
                if (init) {
                    init(editor);
                }
            }
        },
        destroy() {
            if (binding) {
                binding.destroy();
            }
        },
    };
};
