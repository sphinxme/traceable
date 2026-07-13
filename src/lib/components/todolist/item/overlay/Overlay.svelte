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
    class="text-zinc-500 relative h-0 w-0 flex flex-row items-center justify-end"
>
    <div class="absolute px-2 gap-1 flex flex-row items-center">
        {@render children?.()}
    </div>
</div>
