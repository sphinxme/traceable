<script lang="ts">
	/**
	 * 当前时间指示线组件
	 *
	 * 由 skeleton.nowIndicator 定位到 grid-row 3, cols 1/-1, subgrid。
	 * subgrid 继承父网格列轨道，使时间线贯穿全宽且标签可精确定位到某一日列。
	 * nowPercentage 基于 offsetByHour 日界计算（06:00 = 0%, 次日 06:00 = 100%）。
	 */
	import dayjs from "dayjs";
	import { WeekSkeletonController } from "../WeekSkeletonController.svelte";

	interface Props {
		skeleton: WeekSkeletonController;
		nowPercentage: number;
	}

	let { skeleton, nowPercentage }: Props = $props();
</script>

<div use:skeleton.nowIndicator class="relative">
	<!-- 红色横线：贯穿全宽 -->
	<div
		style:z-index={WeekSkeletonController.layers.nowIndicator}
		style:top="{nowPercentage}%"
		style:height="1px"
		class=" w-full absolute bg-red-400"
	></div>
	<!-- 时间标签：显示当前 HH:mm -->
	<div
		style:z-index={WeekSkeletonController.layers.nowIndicatorLabel}
		style:grid-column="3 / 3"
		style:top="{nowPercentage}%"
		style:transform="translateY(-50%)"
		class="absolute text-xs text-red-400 font-light pl-6"
	>
		{dayjs().format("HH:mm")}
	</div>
</div>
