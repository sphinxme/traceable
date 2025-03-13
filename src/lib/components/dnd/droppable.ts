import { linkImg, moveImg } from "./icons";
import { getDnDData } from "./state";

export type DroppableActionParams<T> = {
    channel: string;
    onLink: (data: T) => void;
    onMove: (data: T) => void;
    droppable: (hotKey: boolean, data: T) => "move" | "link" | void;
    getHoverStatus: () => boolean;
    setHoverStatus: (status: boolean) => void;
};

function droppableAction<T>(
    node: HTMLElement,
    { channel, onLink, onMove, droppable, setHoverStatus, getHoverStatus }:
        DroppableActionParams<T>,
) {
    node.ondragenter = (event: DragEvent) => {
        const result = droppable(event.shiftKey, getDnDData(channel));
        if (result) {
            event.preventDefault();
            setHoverStatus(true);
        }
    };

    node.ondragleave = (event: DragEvent) => {
        // if (node.contains(event.target)) {
        //     return
        // }
        setHoverStatus(false);
    };

    node.ondragover = (event: DragEvent) => {
        const dropEffect = droppable(event.shiftKey, getDnDData(channel));
        if (dropEffect) {
            event.preventDefault();
        }
        switch (dropEffect) {
            case "move":
                if (!getHoverStatus()) {
                    setHoverStatus(true);
                }
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "move";
                }

                break;
            case "link":
                if (!getHoverStatus()) {
                    setHoverStatus(true);
                }
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "link";
                }
                break;
            default:
                if (getHoverStatus()) {
                    setHoverStatus(false);
                }
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "none";
                }
                break;
        }
    };

    node.ondrop = (event: DragEvent) => {
        const data = getDnDData<T>(channel);
        const dropEffect = droppable(event.shiftKey, data);
        if (dropEffect) {
            event.preventDefault();
        }
        setHoverStatus(false);
        switch (dropEffect) {
            case "link":
                onLink(data);
                break;
            case "move":
                onMove(data);
                break;
            default:
                break;
        }
    };
}
export { droppableAction as droppable };
