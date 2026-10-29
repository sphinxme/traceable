<script lang="ts">
  /**
   * Calendar — 日历面板。
   */
  import Calendar from "$lib/components/calendar/Calendar.svelte";
  import type { Store } from "$lib/document/entities/store.svelte";

  let { store }: { store: Store } = $props();
</script>

<Calendar {store} />
