<script lang="ts">
    import { Check } from "lucide-svelte";
    import { Moon } from "svelte-loading-spinners";

    interface Props {
        items: Record<string, Promise<any>>;
    }

    let { items }: Props = $props();
</script>

<div class="flex flex-col h-full justify-center">
    {#each Object.entries(items) as [name, promise]}
        {#await promise}
            <div
                class="flex flex-row gap-x-2 w-full justify-center items-center text-slate-600 text-sm"
            >
                <Moon size="0.725" unit="rem" color="black" duration="300ms" />
                <div>loading {name} ...</div>
            </div>
        {:then}
            <div
                class="flex flex-row gap-x-2 w-full justify-center items-center text-slate-600 text-sm"
            >
                <Check size="0.8rem" />
                <div>{name} loaded</div>
            </div>
        {:catch error}
            <div
                class="flex flex-row gap-x-2 w-full justify-center items-center text-red-600 text-sm"
            >
                load {name} error: {error.message}
            </div>
        {/await}
    {/each}
</div>
