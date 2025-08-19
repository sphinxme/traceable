<script lang="ts">
    import { router } from "$lib/router/routerState.svelte";
    import { CalendarRange, PlusCircle, SquareLibrary } from "@lucide/svelte";
    import { Label, RadioGroup } from "bits-ui";

    let choices = [
        {
            id: "/trace",
            icon: PlusCircle,
        },
        {
            id: "/organize",
            icon: SquareLibrary,
        },
        {
            id: "/schedule",
            icon: CalendarRange,
        },
    ];
</script>

<RadioGroup.Root
    class="flex flex-row gap-4 text-sm font-medium h-full p-1.5 "
    value={router.path}
    onValueChange={(value) => router.navigate(value)}
>
    {#each choices as page}
        <RadioGroup.Item
            class="flex flex-row items-center px-2 gap-2 transition-all duration-300 text-nowrap rounded-3xl data-[state=checked]:w-24 data-[state=checked]:text-green-600 data-[state=checked]:text-sm data-[state=checked]:font-normal text-slate-500 text-xs font-light w-10 overflow-clip overflow-y-clip h-full"
            id={page.id}
            value={page.id}
        >
            {#snippet children({ checked })}
                <page.icon size={14} />
                {#if checked}
                    <Label.Root for={page.id}>{page.id.substring(1)}</Label.Root
                    >
                {/if}
            {/snippet}
        </RadioGroup.Item>
    {/each}
</RadioGroup.Root>
