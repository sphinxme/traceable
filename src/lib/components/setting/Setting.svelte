<script>
    import { Button } from "../ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Textarea } from "../ui/textarea";
    import { db } from "@/state";

    let open = $state(false);

    let value = $state("");
    let message = $state("");
    let message2 = $state("");

    let deleteEventPanelOpen = $state(false);
    let deleteEventId = $state("");

    let deleteTaskPanelOpen = $state(false);
    let deleteTaskId = $state("");
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

<Button onclick={() => (deleteEventPanelOpen = true)}>delete event</Button>
<Button onclick={() => (deleteTaskPanelOpen = true)}>delete task</Button>

<Button
    onclick={async () => {
        await db.clear();
        message2 = "已清空";
        window.location.reload();
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
                await db.import(JSON.parse(value));
                message = "已导入, 三秒后重启";
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }}
        >
            导入
        </Button>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteEventPanelOpen}>
    <Dialog.Content>
        <Textarea bind:value={deleteEventId} />
        <Button
            onclick={async () => {
                await db.eventProxyManager.delete(deleteEventId);
                message2 = "已删除";
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }}
        >
            删除event
        </Button>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteTaskPanelOpen}>
    <Dialog.Content>
        <Textarea bind:value={deleteTaskId} />
        <Button
            onclick={async () => {
                await db.eventProxyManager.delete(deleteTaskId);
                message2 = "已删除";
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }}
        >
            删除task
        </Button>
    </Dialog.Content>
</Dialog.Root>
