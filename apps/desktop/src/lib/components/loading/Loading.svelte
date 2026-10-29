<script lang="ts">
  import { Check, Loader2 } from "@lucide/svelte";

  interface Props {
    items: Record<string, Promise<any>>;
  }

  let { items }: Props = $props();
</script>

<div data-tauri-drag-region class="flex h-full flex-col justify-center">
  {#each Object.entries(items) as [name, promise]}
    {#await promise}
      <div
        class="flex w-full flex-row items-center justify-center gap-x-2 text-sm text-slate-600"
      >
        <Loader2 class="size-3 animate-spin" />
        <div>loading {name} ...</div>
      </div>
    {:then}
      <div
        class="flex w-full flex-row items-center justify-center gap-x-2 text-sm text-slate-600"
      >
        <Check size="0.8rem" />
        <div>{name} loaded</div>
      </div>
    {:catch error}
      <div
        class="flex w-full flex-row items-center justify-center gap-x-2 text-sm text-red-600"
      >
        load {name} error: {error.message}
      </div>
    {/await}
  {/each}
</div>
