<script lang="ts">
    import { router } from "$lib/router/routerState.svelte";
    import { onMount } from "svelte";

    let {} = $props();
    // import { push } from "svelte-spa-router";
    onMount(() => {
        router.navigate("/trace");
    });
    // push("/trace");
</script>

Redirecting...
