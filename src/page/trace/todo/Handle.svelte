<script lang="ts">
    import {
        Draggable,
        ThirdPartyDraggable,
    } from "@fullcalendar/interaction/index.js";
    import { onMount } from "svelte";
    import { db } from "./data";

    export let taskId: string;

    let container: HTMLDivElement;
    onMount(() => {
        const draggable = new ThirdPartyDraggable(container, {
            eventData(el) {
                return {
                    title: taskId,
                    id: db.genEventId(),
                    extendedProps: {
                        taskId: taskId,
                    },
                };
            },
        });
        return () => {
            draggable.destroy();
        };
    });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    on:click
    bind:this={container}
    data-task-id={taskId}
    class="ctr cursor-grab relative handle flex justify-center items-center"
>
    <span
        class="background-ring absolute w-5 h-5 rounded-full bg-slate-200 z-0 opacity-0 transition-opacity duration-100 ease-in"
    />
    <span class=" w-2 h-2 rounded-full bg-slate-500 z-10"> </span>
</div>

<style>
    .ctr:hover .background-ring {
        opacity: 1;
        user-select: none;
    }
</style>
