<script lang="ts">
  /**
   * AppProvider — 组合根宿主。
   *
   * 在 Y.Doc 异步加载完成后挂载（App.svelte 的 `{#await}` then 分支）：
   * 组件初始化期构造 AppServices 并注入模块级单例，随后渲染 children。
   * `KeyboardService` 构造器内的 `$effect` 要求此构造发生在组件初始化上下文。
   */
  import type { Snippet } from "svelte";
  import type { Database } from "$lib/document/entities/database.svelte";
  import { AppServices, setAppServices } from "./context.svelte";

  interface Props {
    db: Database;
    children?: Snippet;
  }

  let { db, children }: Props = $props();

  const services = new AppServices(db);
  setAppServices(services);
</script>

{@render children?.()}
