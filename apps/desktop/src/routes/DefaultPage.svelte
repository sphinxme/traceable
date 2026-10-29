<script lang="ts">
  import { router } from "$lib/router/routerState.svelte";
  import { onMount } from "svelte";

  let {} = $props();
  onMount(() => {
    router.navigate("/trace");
  });
</script>

Redirecting...
