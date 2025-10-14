<script lang="ts">
    import { router } from "$lib/router/routerState.svelte";
    import { CalendarRange, CirclePlus, SquareLibrary } from "@lucide/svelte";
    import { Label, RadioGroup } from "bits-ui";

    import {
        blur,
        crossfade,
        draw,
        fade,
        fly,
        scale,
        slide,
    } from "svelte/transition";

    let choices = [
        {
            id: "/trace",
            label: "Trace",
            icon: CirclePlus,
        },
        {
            id: "/organize",
            label: "Organize",
            icon: SquareLibrary,
        },
        {
            id: "/schedule",
            label: "Schedule",
            icon: CalendarRange,
        },
    ];
</script>

<RadioGroup.Root
    data-tauri-drag-region
    class="flex flex-row gap-4 text-sm font-medium h-full p-1.5 flex-grow justify-center "
    value={router.path}
    onValueChange={(value) => router.navigate(value)}
>
    {#each choices as page}
        <RadioGroup.Item
            class="flex flex-row items-center px-2 text-nowrap rounded-3xl data-[state=checked]:bg-gray-300 hover:bg-gray-300 text-slate-700 text-xs overflow-clip overflow-y-clip h-full"
            id={page.id}
            value={page.id}
        >
            {#snippet children({ checked })}
                <page.icon size={16} />
                <Label.Root
                    for={page.id}
                    class="{checked
                        ? 'w-24'
                        : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden "
                >
                    {page.label}
                </Label.Root>
            {/snippet}
        </RadioGroup.Item>
    {/each}
</RadioGroup.Root>
