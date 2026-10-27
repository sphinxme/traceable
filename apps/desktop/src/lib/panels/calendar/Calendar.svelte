<script lang="ts">
  /**
   * Calendar — 日历面板。
   */
  import Calendar from "$lib/components/calendar/Calendar.svelte";
  import type { Store } from "$lib/states/meta/store.svelte";

  let { store }: { store: Store } = $props();
</script>

<Calendar {store} />
