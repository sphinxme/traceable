<script>
  import { Button } from "../ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Textarea } from "../ui/textarea";
  import { getAppServices } from "$lib/app/context.svelte";

  const services = getAppServices();

  let open = $state(false);

  let value = $state("");
  let message = $state("");
  let message2 = $state("");

  let deleteEventPanelOpen = $state(false);
  let deleteEventId = $state("");
</script>

{message2}
<Button
  onclick={async () => {
    value = JSON.stringify(services.database.export(), null, 2);
    open = true;
  }}
>
  导入/导出
</Button>

<Button onclick={() => (deleteEventPanelOpen = true)}>delete event</Button>

<Button
  onclick={async () => {
    services.database.clear();
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
        services.database.import(JSON.parse(value));
        services.panelState.sweep();
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
        services.store.deleteEvent(deleteEventId);
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
