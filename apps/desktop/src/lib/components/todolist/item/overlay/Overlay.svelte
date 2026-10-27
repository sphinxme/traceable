<script lang="ts">
  /**
   * Overlay — 叠加层容器组件。
   *
   * 在 TodoItem 的标题编辑器左侧渲染一个零尺寸的定位容器，
   * 用于叠加显示折叠按钮、拖拽手柄等交互元素。
   *
   * 子内容通过 snippet 传入，绝对定位在容器内。
   *
   * @prop children - 叠加层内容 snippet
   */
  import { type Snippet } from "svelte";
  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<div
  class="relative flex h-0 w-0 flex-row items-center justify-end text-zinc-500"
>
  <div class="absolute flex flex-row items-center gap-1 px-2">
    {@render children?.()}
  </div>
</div>
