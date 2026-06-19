import type { Action } from "svelte/action";
import interact from "interactjs";

import type { Task } from "$lib/states/meta/task.svelte";
import type { DragService } from "$lib/interaction/services/DragService.svelte";


export const dayDropZone: Action<HTMLDivElement> = (node) => {
    interact(node).dropzone({
        ondrop(event) {
            // console.log({ ondrop: event })
        },
    });
};

type DayExternalDropZoneParams = {
    drag: DragService;
    onDragOver: (task: Task, topPx: number) => void;
    onDragEnd: () => void;
    onDrop: (task: Task, topPx: number) => void;
};

export const dayExternalDropZone: Action<
    HTMLDivElement,
    DayExternalDropZoneParams
> = (node, { drag, onDragOver, onDragEnd, onDrop }) => {
    node.ondragover = (event) => {
        event.preventDefault();
        const data = drag.data;
        if (!data) {
            return;
        }
        onDragOver(data.task, event.offsetY);
    };
    node.ondragend = (event) => {
        event.preventDefault();
        onDragEnd();
    };
    node.ondrop = (event) => {
        event.preventDefault();
        const data = drag.data;
        if (!data) {
            return;
        }
        // const data: TaskDnDData = getDnDData("tasks");
        onDrop(data.task, event.offsetY);
    };
};
