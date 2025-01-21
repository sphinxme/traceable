<script lang="ts">
    import { onMount } from "svelte";

    interface Props {
        focus: boolean;
        inline?: ScrollLogicalPosition;
        block?: ScrollLogicalPosition;
    }

    let { focus, inline, block }: Props = $props();
    let container: HTMLDivElement;

    onMount(() => {
        if (focus) {
            console.log("scrolling");
            setTimeout(() => {
                container.scrollIntoView({
                    behavior: "smooth",
                    inline,
                    block,
                });
            }, 100);
        }
    });
</script>

<div bind:this={container}></div>
