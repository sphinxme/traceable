<script lang="ts">
    import { type Snippet } from "svelte";
    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();
</script>

<div
    class="text-zinc-500 relative h-0 w-0 flex flex-row items-center justify-end"
>
    <div class="absolute px-2 gap-1 flex flex-row items-center">
        {@render children?.()}
    </div>
</div>
