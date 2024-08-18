import type { Database } from "$lib/states/data";
import Quill from "quill";
import type { Action } from "svelte/action";
import { QuillBinding } from "y-quill";

type QuillActionParams = {
    taskId: string;
    db: Database;
}
export const quill: Action<HTMLDivElement, QuillActionParams> = (container, {taskId, db}) => {
    const editor = new Quill(container, {
			modules: {
				toolbar: false
			},
			theme: 'bubble',
			placeholder: 'placeholder'
    });
    
    let binding = new QuillBinding(db.getTaskText(taskId), editor /*, provider.awareness*/);

    return {
        update({taskId, db}) {
            binding.destroy();
            binding = new QuillBinding(db.getTaskText(taskId), editor /*, provider.awareness*/);
        },
        destroy() {
            binding.destroy();
        },
    }
}