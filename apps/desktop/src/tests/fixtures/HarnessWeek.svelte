<!-- 真实 Week 宿主：装配 AppServices 后挂载周视图。 -->
<script lang="ts">
  import type { Database } from "$lib/document/entities/database.svelte";
  import { AppServices, setAppServices } from "$lib/app/context.svelte";
  import Week from "$lib/components/calendar/week/Week.svelte";

  interface Props {
    db: Database;
  }

  let { db }: Props = $props();

  const services = new AppServices(db);
  setAppServices(services);
</script>

<Week store={db.store} />
