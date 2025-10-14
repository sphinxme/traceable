<script lang="ts">
    import type { Component } from "svelte";
    import { router } from "./routerState.svelte";

    interface Props {
        routes: Record<string, Component>;
    }

    let { routes }: Props = $props();
    router.init();

    console.log(router.path);

    $effect(() => {
        console.log(router.path);
    });

    let ActiveComponent = $derived(routes[router.path]);
</script>

<ActiveComponent></ActiveComponent>
