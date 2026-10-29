<!-- 真实 Editor 宿主：装配 AppServices，接近完整应用（不含路由）。 -->
<script lang="ts">
  import type { Database } from "$lib/document/entities/database.svelte";
  import { AppServices, setAppServices } from "$lib/app/context.svelte";
  import Editor from "$lib/panels/todo/Editor.svelte";

  interface Props {
    db: Database;
  }

  let { db }: Props = $props();

  const services = new AppServices(db);
  setAppServices(services);

  const rootTaskId = db.userManager.rootTask!.id;
</script>

<Editor panelId="root" {rootTaskId} />
