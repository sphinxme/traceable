import type { Action } from 'svelte/action';
import dragula from "dragula";
// import "dragula/dist/dragula.css";

const callbackByNode = new Map<>
const dispatcher = () => {

}

const instance = dragula({

    isContainer: function (el) {
        el?.classList.contains("draggable");
        return false; // only elements in drake.containers will be taken into account
    },

    /*
    moves: function (el, source, handle, sibling) {
        return true; // elements are always draggable by default
    },
    */
    /*
    accepts: function (el, target, source, sibling) {
        return true; // elements can be dropped in any of the `containers` by default
    },
    */
    /*
    invalid: function (el, handle) {
        return false; // don't prevent any drags from initiating by default
    },
    */
    // direction: 'vertical',             // Y axis is considered when determining where an element would be dropped
    // copy: false,                       // elements are moved by default, not copied
    // copySortSource: false,             // elements in copy-source containers can be reordered
    revertOnSpill: true,              // spilling will put the element back where it was dragged from, if this is true
    // removeOnSpill: false,              // spilling will `.remove` the element, if this is true
    // mirrorContainer: document.body,    // set the element that gets mirror elements appended
    // ignoreInputTextSelection: true,     // allows users to select input text, see details below
    // slideFactorX: 0,               // allows users to select the amount of movement on the X axis before it is considered a drag instead of a click
    // slideFactorY: 0,               // allows users to select the amount of movement on the Y axis before it is considered a drag instead of a click
});

type DraggableOptions = {
    rootId: string; // 当前页面的总的rootId, 如果挪到了不同的rootId, 那可能是挪到了不同的panel
    // panelId:string;
}
export { container as DraggableContainer }
const container: Action<HTMLElement, DraggableOptions> = (node, options) => {
    // the node has been mounted in the DOM

    // instance.containers.push(node);
    // node.
    // node.dataset.draggable = "true";


    return {
        update(arg) {
            // the value of `bar` has changed
        },

        destroy() {
            // the node has been removed from the DOM
            // delete(node.dataset, "draggable")

        },
    };
};