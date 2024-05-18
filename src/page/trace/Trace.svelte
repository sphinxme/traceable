<script lang="ts">
    import * as Resizable from "$lib/components/ui/resizable";
    import Calendar from "./Calendar.svelte";
    import Editor from "./Editor.svelte";
    import { db } from "./todo/data";
    import * as HoverCard from "$lib/components/ui/hover-card";

    // const db = new Database();
    export let rootId = "root";
</script>

{#await db.load()}
    loading...
{:then ok}
    <div class="flex flex-col h-full bg-slate-100">
        <div class="header h-10 shadow-xl bg-background">header</div>
        <div class="body grow flex flex-row p-4">
            <Resizable.PaneGroup
                style="overflow:visible;"
                direction="horizontal"
            >
                <Resizable.Pane style="overflow:visible">
                    <div class="pr-2 h-full">
                        <Calendar {db} {rootId} />
                    </div>
                </Resizable.Pane>
                <Resizable.Handle />
                <Resizable.Pane style="overflow:visible;">
                    <div class="pl-2 h-full">
                        <Editor {db} {rootId} />
                    </div>
                </Resizable.Pane>
            </Resizable.PaneGroup>
        </div>
    </div>
{/await}
