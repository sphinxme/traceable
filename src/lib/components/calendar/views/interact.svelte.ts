import type { Action } from "svelte/action";
import dayjs, { Dayjs } from "dayjs";
import interact from "interactjs";

import type { TaskProxy } from "$lib/states/meta/task.svelte";
import { draggingTaskData } from "$lib/components/todolist/controller/DragDropActions.svelte";


type ResizeActionParams = {
    onDropMove: (day: Dayjs, topPx: number) => void;
    onDropEnd: () => void;
    onResizeMove: (heightPx: number) => void;
    onResizeEnd: () => void;
};

function getComputedStyleTop(element: HTMLElement) {
    // 获取计算样式
    const computedStyle = window.getComputedStyle(element);

    // 获取 top 样式属性值
    const topStyle = computedStyle.getPropertyValue("top");

    // 如果没有设置 top 值，返回 0
    if (topStyle === "auto") {
        return 0;
    }

    // 返回 top 值（以像素为单位）
    return parseFloat(topStyle);
}

export const dayDropZone: Action<HTMLDivElement> = (node) => {
    interact(node).dropzone({
        ondrop(event) {
            // console.log({ ondrop: event })
        },
    });
};

type DayExternalDropZoneParams = {
    onDragOver: (task: TaskProxy, topPx: number) => void;
    onDragEnd: () => void;
    onDrop: (task: TaskProxy, topPx: number) => void;
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

const interactAction: Action<HTMLDivElement, ResizeActionParams> = (
    node,
    { onDropMove, onDropEnd, onResizeEnd, onResizeMove },
) => {
    interact(node)
        .resizable({
            invert: "reposition",
            autoScroll: false,
            edges: {
                bottom: true,
                // top: true,
            },
            listeners: {
                start(event) {
                    node.style.opacity = "50%";
                },
                move(event) {
                    onResizeMove(event.rect.height);
                    // node.style.height = event.rect.height+'px';
                },
                end(event) {
                    node.style.opacity = "100%";
                    onResizeEnd();
                },
            },
        })
        .draggable({
            // modifiers: [
            //     interact.modifiers.snap({
            //       targets: [
            //         interact.snappers.grid({ x: 1, y: 24 })
            //       ],
            //       range: Infinity,
            //       relativePoints: [ { x: 0, y: 0 } ]
            //     })
            //   ],

            listeners: {
                start(event) {
                },
                move(event) {
                    const top = getComputedStyleTop(node) + event.dy;
                    // node.style.top = top +'px' // 手感更好

                    const targetDay = event.dropzone.target;
                    // node.style.gridColumnStart=String(parseInt(getComputedStyleColNum(targetDay))+1) // 因为子网格跟外面网格不一致 所以+1;
                    const startDay = dayjs(parseInt(targetDay.dataset.dayts));
                    onDropMove(startDay, top);
                },
                end(event) {
                    onDropEnd();
                },
            },
        });
};
export { interactAction as interact };
