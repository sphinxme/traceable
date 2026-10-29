<!-- 真实 Weekly 宿主：装配 AppServices 后挂载 JournalPanel。 -->
<script lang="ts">
  import type { Database } from "$lib/document/entities/database.svelte";
  import { AppServices, setAppServices } from "$lib/app/context.svelte";
  import Weekly from "$lib/panels/journal/Weekly.svelte";

  interface Props {
    db: Database;
  }

  let { db }: Props = $props();

  const services = new AppServices(db);
  setAppServices(services);
</script>

<Weekly panelId="weekly" store={db.store} />
