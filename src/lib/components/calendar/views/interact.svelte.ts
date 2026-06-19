import type { Action } from "svelte/action";
import interact from "interactjs";

import type { Task } from "$lib/states/meta/task.svelte";
import { draggingTaskData } from "$lib/components/todolist/controller/DragDropActions.svelte";


export const dayDropZone: Action<HTMLDivElement> = (node) => {
    interact(node).dropzone({
        ondrop(event) {
            // console.log({ ondrop: event })
        },
    });
};

type DayExternalDropZoneParams = {
    onDragOver: (task: Task, topPx: number) => void;
    onDragEnd: () => void;
    onDrop: (task: Task, topPx: number) => void;
};

export const dayExternalDropZone: Action<
    HTMLDivElement,
    DayExternalDropZoneParams
> = (node, { onDragOver, onDragEnd, onDrop }) => {
    node.ondragover = (event) => {
        event.preventDefault();
        if (!draggingTaskData) {
            return;
        }
        onDragOver(draggingTaskData.task, event.offsetY);
    };
    node.ondragend = (event) => {
        event.preventDefault();
        onDragEnd();
    };
    node.ondrop = (event) => {
        event.preventDefault();
        if (!draggingTaskData) {
            return;
        }
        // const data: TaskDnDData = getDnDData("tasks");
        onDrop(draggingTaskData.task, event.offsetY);
    };
};
