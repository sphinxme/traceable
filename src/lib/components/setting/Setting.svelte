<script>
    import { Button } from "../ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Textarea } from "../ui/textarea";
    import { db } from "@/state";

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
                message = "已导入";
                window.location.reload();
            }}
        >
            导入
        </Button>
    </Dialog.Content>
</Dialog.Root>
