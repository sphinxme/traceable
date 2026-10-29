<script lang="ts">
  import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
  import Editor from "$lib/panels/todo/Editor.svelte";
  import Weekly from "$lib/panels/journal/Weekly.svelte";
  import { getAppServices } from "$lib/app/context.svelte";

  const services = getAppServices();
  const rootTask = services.database.userManager.rootTask;
  if (!rootTask) {
    throw new Error("rootTask is undefined");
  }
</script>

<PaneGroup direction="horizontal" class=" gap-1.5 p-3 pt-0">
  <Pane
    style="transition-property: box-shadow, border;"
    class="rounded-lg shadow-lg transition-shadow duration-700 focus-within:shadow-2xl"
  >
    <Weekly panelId="weekly" store={services.store} />
  </Pane>
  <PaneResizer />
  <Pane
    style="transition-property: box-shadow, border;"
    class="rounded-lg shadow-lg transition-shadow duration-700 focus-within:shadow-2xl"
  >
    <Editor panelId="root" rootTaskId={rootTask.id} />
  </Pane>
</PaneGroup>
