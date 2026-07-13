<script lang="ts">
	/**
	 * 周视图网格外壳组件
	 *
	 * 薄容器，仅通过 skeleton.root action 应用 grid template + 固定尺寸。
	 * 子内容（NowIndicator、DayHeader、DayGrid、EventSegment、DragPreview 等）
	 * 由 Week.svelte 通过 children snippet 传入，保持模板可见性。
	 */
	import { type Snippet } from "svelte";
	import type { WeekSkeletonController } from "./WeekSkeletonController.svelte";

	interface Props {
		skeleton: WeekSkeletonController;
		children: Snippet;
	}

	let { skeleton, children }: Props = $props();
</script>

<div data-tauri-drag-region use:skeleton.root class="relative rounded-lg">
	{@render children()}
</div>
