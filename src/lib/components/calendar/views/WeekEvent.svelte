<script lang="ts">
	import { onMount } from "svelte";
	import dayjs from "dayjs";
	import interact from "interactjs";

	import * as ContextMenu from "$lib/components/ui/context-menu";
	import * as Tooltip from "$lib/components/ui/tooltip";

	import {
		foucsingEventIds,
		highlightFEventIds,
	} from "$lib/states/stores.svelte";
	import { percent } from "./utils.svelte";
	import type { EventProxy } from "$lib/states/meta/event.svelte";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";
	import ObservableText from "$lib/components/ObservableText.svelte";
	import { CornerLeftUp, Redo2 } from "lucide-svelte";
	import { highlightTaskSignal } from "$lib/states/signals.svelte";
	import { fade } from "svelte/transition";

	interface Props {
		dayHeight: number;
		dayWidth: number;
		event: EventProxy;
		task: TaskProxy;
		offsetByHour: number;
		snapsOffset: number[];
		getColumnIndex: (t: number) => number;
	}

	let {
		dayHeight,
		dayWidth,
		event,
		task,
		offsetByHour,
		getColumnIndex,
		snapsOffset,
	}: Props = $props();

	let container: HTMLDivElement;
	const calculateTopOffset2 = (start: number, dayHeight: number): number => {
		const startOfDay = dayjs(start)
			.add(-offsetByHour, "hour")
			.startOf("day")
			.add(offsetByHour, "hour");
		const percentOfDay = percent(startOfDay.valueOf(), start);
		const result = Math.floor(percentOfDay * dayHeight);
		return result;
	};
	const calculateEventHeight2 = (
		start: number,
		end: number,
		dayHeight: number,
	): number => {
		return Math.floor(percent(start, end) * dayHeight);
	};

	const reactiveStart = event.start$;
	const reactiveEnd = event.end$;
	const text = task.text$;
	const note = task.note$;
	const isCompleted = task.isCompleted$;
	const highlight = $derived(highlightFEventIds[event.id]);
	const focusMe = $derived(foucsingEventIds[event.id] || false);
	$effect(() => {
		if (focusMe) {
			container.scrollIntoView({
				behavior: "smooth",
				inline: "center",
				block: "center",
			});
			foucsingEventIds[event.id] = false;
		}
	});
	let parentTasks = task.parents.$;

	// 定位坐标: 移动过程中会被即时值替换
	// 如果外部改动了, 也会自动刷新
	let topOffset = $state(calculateTopOffset2($reactiveStart, dayHeight)); // 单位px
	let eventHeight = $state(
		calculateEventHeight2($reactiveStart, $reactiveEnd, dayHeight),
	); // 单位px
	let columnIndex = $state(getColumnIndex($reactiveStart));
	// 仅用于事件的展示, 在移动过程中会被offsetTop的即时值替换
	let previewStart = $state($reactiveStart);
	let previewEnd = $state($reactiveEnd);
	let clickCount = $state(0);
	let isResizing = $state(false);

	$effect(() => {
		topOffset = calculateTopOffset2($reactiveStart, dayHeight);
		eventHeight = calculateEventHeight2(
			$reactiveStart,
			$reactiveEnd,
			dayHeight,
		);
		columnIndex = getColumnIndex($reactiveStart);
		previewStart = $reactiveStart;
		previewEnd = $reactiveEnd;
	});

	function formatDuration(duration: number): string {
		const hours = Math.floor(duration / (60 * 60 * 1000));
		const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));

		if (hours === 0) {
			return `${minutes}分钟`;
		}
		if (minutes === 0) {
			return `${hours}小时`;
		}
		if (minutes === 30) {
			return `${hours}.5小时`;
		}

		return `${hours}小时${minutes}分钟`;
	}

	function roundToNearest15Minutes(
		snapsOffset: number[],
		offset: number,
	): number {
		for (const snap of snapsOffset) {
			// 15px内自动吸附
			if (Math.abs(offset - snap) < 5) {
				return snap;
			}
		}
		return offset;
	}

	onMount(() => {
		// 移动过程中暂存的变量
		let preStart = event.start;
		let preEnd = event.end;
		let preDuration = preStart - preEnd;

		let realTopOffset = topOffset; // 吸附时使用, 虽然吸附了 但是还在继续记录移动距离
		let realHeight = eventHeight; //  吸附时使用, 虽然吸附了 但是还在继续记录拉动距离
		const refesh = () => {
			preStart = event.start;
			preEnd = event.end;
			preDuration = preEnd - preStart;
			realTopOffset = topOffset;
			realHeight = eventHeight;
		};

		interact(container)
			.resizable({
				invert: "reposition",
				autoScroll: false,
				edges: {
					bottom: true,
					// top: true,
				},
				listeners: {
					start(dragEvent) {
						isResizing = true;
						// 初始化中间变量, 用于显示
						refesh();
						container.style.opacity = "50%";
					},
					move(dragEvent) {
						let heightPx = dragEvent.rect.height;
						eventHeight = heightPx;
						previewEnd =
							preStart +
							(heightPx / dayHeight) * 24 * 60 * 60 * 1000;
						// TODO:吸附
					},
					end(dragEvent) {
						isResizing = false;
						container.style.opacity = "75%";
						const duration =
							(24 * 60 * 60 * 1000 * eventHeight) / dayHeight;
						event.resizeTo(duration);
					},
				},
			})
			.draggable({
				listeners: {
					start(dragEvent) {
						container.style.opacity = "50%";
						// 初始化中间变量, 用于显示
						refesh();
					},
					move(dragEvent) {
						const targetDayStartTs = Number(
							dragEvent.dropzone.target.dataset.dayts,
						);
						columnIndex = getColumnIndex(targetDayStartTs);
						realTopOffset += dragEvent.dy;
						topOffset = roundToNearest15Minutes(
							snapsOffset,
							realTopOffset,
						);

						previewStart =
							(topOffset / dayHeight) * 24 * 60 * 60 * 1000 +
							targetDayStartTs;
						previewEnd = previewStart + preDuration;
					},
					end(dragEvent) {
						container.style.opacity = "75%";
						const targetDayTs = Number(
							dragEvent.dropzone.target.dataset.dayts,
						);
						const startTempTs =
							(topOffset / dayHeight) * (24 * 60 * 60 * 1000) +
							targetDayTs;
						const startTemp = dayjs(startTempTs)
							.startOf("minute")
							.valueOf();
						event.moveTo(startTemp);
					},
				},
			})
			.on("tap", (e) => {
				clickCount++;
				highlightTaskSignal.next({
					id: task.id,
					index: clickCount,
				});
			});
	});
</script>

<div
	bind:this={container}
	style:z-index="8"
	class="absolute w-full grow-0 overflow-visible rounded-lg {$isCompleted
		? 'bg-zinc-400'
		: 'bg-zinc-600'} p-1 text-sm text-zinc-50 opacity-75 {highlight
		? 'p-0 shadow-2xl shadow-zinc-700'
		: 'shadow-lg'}"
	style:grid-row="3"
	style:grid-column="{columnIndex + 2} / {columnIndex + 2}"
	style:transform="translateY({topOffset}px)"
	style:height="{eventHeight}px"
>
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={0}>
			<Tooltip.Trigger class="h-full w-full">
				<ContextMenu.Root>
					<ContextMenu.Trigger
						class="flex h-full w-full relative flex-col text-left p-1 overflow-clip select-text"
					>
						{#if isResizing}
							<!-- 垂直居中 -->
							<div
								transition:fade={{ duration: 300 }}
								class=" pb-2 absolute flex-col flex items-start justify-between h-full text-xs font-light"
							>
								<div>
									{dayjs(previewStart).format("HH:mm")}
								</div>
								<div>
									{formatDuration(previewEnd - previewStart)}
								</div>
								<div>
									{dayjs(previewEnd).format("HH:mm")}
								</div>
							</div>
						{:else}
							<div
								class=" absolute h-full"
								transition:fade={{ duration: 300 }}
							>
								<div
									class="break-words pb-1 text-wrap text-ellipsis"
								>
									{$text}
								</div>
								<div class=" text-xs pb-3 font-extralight">
									{dayjs(previewStart).format("HH:mm")}
									-
									{dayjs(previewEnd).format("HH:mm")}
								</div>
								{#each $parentTasks as parentTask}
									<p
										class=" text-xs whitespace-nowrap overflow-hidden text-ellipsis font-extralight inline w-full"
									>
										<Redo2
											class="inline"
											size="10"
										/><ObservableText
											text={parentTask.text$}
										/>
									</p>
								{/each}
							</div>
						{/if}
					</ContextMenu.Trigger>
					<ContextMenu.Content>
						<ContextMenu.Item onclick={() => event.destory()}>
							删除
						</ContextMenu.Item>
					</ContextMenu.Content>
				</ContextMenu.Root>
			</Tooltip.Trigger>
			<Tooltip.Content class="select-text">
				{#each $parentTasks as parentTask}
					<p class="text-xs inline font-bold">
						<Redo2 class="inline" size="10" />
						<ObservableText text={parentTask.text$} />
					</p>
				{/each}
				<div class=" pt-2 text-xs font-bold">
					{dayjs(previewStart).format("HH:mm")}
					-
					{dayjs(previewEnd).format("HH:mm")}
				</div>
				<div class="break-words font-semibold">
					{$text}
				</div>

				<p class=" pt-2 text-nowrap text-zinc-500 whitespace-pre-line">
					{$note}
				</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.resize {
		opacity: 0; /* 初始状态为透明 */
		animation: fadeIn 300ms ease-out forwards; /* 动画持续300毫秒，并保持最终状态 */
	}
</style>
