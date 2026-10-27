<script lang="ts">
  /**
   * Navigator — 面包屑导航，渲染 `EditorPanelController.currentPaths`。
   *
   * 第一项渲染为 House 图标（点击缩放退回该层），中间项可点击（popTo 缩放退出），
   * 末项为当前 home（Page 样式，不可点击）。位于根 home 时首个分隔线旋转 45° 作装饰。
   */
  import {
    Root,
    List,
    Item,
    Separator,
    Page,
    Link,
  } from "$lib/components/ui/breadcrumb";
  import Text from "../../components/ObservableText.svelte";
  import { House } from "@lucide/svelte";
  import type { EditorPanelController } from "$lib/panels/PanelController.svelte";

  interface Props {
    controller: EditorPanelController;
  }

  let { controller }: Props = $props();
</script>

<Root>
  <List>
    {#each controller.currentPaths as task, i (task.id)}
      <Item index={i}>
        {#if i === 0}
          <Link href="lang">
            {#snippet child(attrs)}
              <button {...attrs} onclick={() => controller.popTo(i)}>
                <House class="my-1" size={18} />
              </button>
            {/snippet}
          </Link>
        {:else if i + 1 < controller.currentPaths.length}
          <Link href="lang">
            {#snippet child(attrs)}
              <button {...attrs} onclick={() => controller.popTo(i)}>
                <Text text={task.text.toJSON()} />
              </button>
            {/snippet}
          </Link>
        {:else}
          <Page>
            <Text text={task.text.toJSON()} />
          </Page>
        {/if}
      </Item>
      {#if i === 0}
        <Separator
          index={i}
          class={controller.isRootHome
            ? "-rotate-45 transition-transform"
            : "transition-transform"}
        />
      {:else if i + 1 < controller.currentPaths.length}
        <Separator index={i} />
      {/if}
    {/each}
  </List>
</Root>
