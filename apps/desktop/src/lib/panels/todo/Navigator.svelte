<script lang="ts">
  /**
   * Navigator — 面包屑导航，渲染 `EditorPanel.navTaskList`。
   *
   * 第一项渲染为 House 图标（点击退回该层），中间项可点击（popTo 缩放退出），
   * 末项为当前 home（Page 样式，不可点击）。
   */
  import {
    Root,
    List,
    Item,
    Separator,
    Page,
    Link,
  } from "$lib/components/ui/breadcrumb";
  import { House } from "@lucide/svelte";
  import type { EditorPanel } from "$lib/view/panel.svelte";

  interface Props {
    panel: EditorPanel;
  }

  let { panel }: Props = $props();
</script>

<Root>
  <List>
    {#each panel.navTaskList as task, i (task.id)}
      <Item>
        {#if i === 0}
          <Link href="lang">
            {#snippet child(attrs)}
              <button {...attrs} onclick={() => panel.popTo(i)}>
                <House class="my-1" size={18} />
              </button>
            {/snippet}
          </Link>
        {:else if i + 1 < panel.navTaskList.length}
          <Link href="lang">
            {#snippet child(attrs)}
              <button {...attrs} onclick={() => panel.popTo(i)}>
                {task.$text || "未命名"}
              </button>
            {/snippet}
          </Link>
        {:else}
          <Page>
            {task.$text || "未命名"}
          </Page>
        {/if}
      </Item>
      {#if i === 0}
        <Separator
          class={panel.isRootHome
            ? "-rotate-45 transition-transform"
            : "transition-transform"}
        />
      {:else if i + 1 < panel.navTaskList.length}
        <Separator />
      {/if}
    {/each}
  </List>
</Root>
