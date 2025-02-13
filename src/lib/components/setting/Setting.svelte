<script>
    import { Button } from "../ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { db } from "$lib/states/rxdb";
    import { Textarea } from "../ui/textarea";
    import { clearPaths } from "$lib/panels/todo/state.svelte";

    let open = $state(false);
    let value = $state("");
    let message = $state("");
    let message2 = $state("");
</script>

{message2}
<Button
    onclick={async () => {
        value = JSON.stringify(await db.export(), null, 2);
        open = true;
    }}
>
    导入/导出
</Button>

<Button
    onclick={async () => {
        await db.clear();
        clearPaths();
        message2 = "已清空";
    }}
>
    清空
</Button>

<Dialog.Root bind:open>
    <Dialog.Content>
        <Textarea bind:value />
        {message}
        <Button
            onclick={async () => {
                message = "";
                await clearPaths();
                await db.import(JSON.parse(value));
                message = "已导入";
            }}
        >
            导入
        </Button>
    </Dialog.Content>
</Dialog.Root>
