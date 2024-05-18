<script lang="ts">
    import { onMount } from "svelte";
    import { filterNullProps } from "./helpers";
    import type { DraggableEvent } from "./draggable-events";
    import { Draggable } from "@fullcalendar/interaction";

    let classes: string | undefined;
    export { classes as class };

    export let style: string = "";

    export let appendTo: string;

    export let eventData: DraggableEvent;

    export let itemSelector: string;

    export let longPressDelay: number;

    export let minDistance: number;

    let elementRef: HTMLDivElement;

    let draggable: Draggable;

    onMount(() => {
        if (!draggable && elementRef) initDraggable();

        return () => {
            draggable && draggable.destroy();
        };
    });

    $: () => {
        draggable && draggable.destroy();
        elementRef && initDraggable();
    };

    function getFilledProps() {
        const props = {
            appendTo,
            eventData,
            itemSelector,
            longPressDelay,
            minDistance,
        };

        return filterNullProps(props);
    }

    async function initDraggable() {
        draggable = new Draggable(elementRef, {
            ...getFilledProps(),
        });
    }
</script>

<div bind:this={elementRef} class={classes} {style}>
    <slot />
</div>
