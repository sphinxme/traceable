import { dragging, setDnDData } from "./state";
import { moveImg } from "./icons";

export type DraggableActionParams<T> = {
    channel: string;
    onDragStart: () => T;
    onDragEnd?: () => void;
};

export function draggable<T>(
    node: HTMLElement,
    { channel, onDragStart, onDragEnd }: DraggableActionParams<T>,
) {
    node.ondragstart = (event) => {
        dragging.set(true);
        if (event.dataTransfer) {
            event.dataTransfer.setDragImage(moveImg, 2, 2);
            event.dataTransfer.effectAllowed = "all";
        }

        const data = onDragStart();
        setDnDData(channel, data);
    };
    node.ondragend = (event) => {
        dragging.set(false);
        if (onDragEnd) {
            onDragEnd();
        }
    };
    node.draggable = true;

    // node.ondrag
}
