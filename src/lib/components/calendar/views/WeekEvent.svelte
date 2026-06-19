<script lang="ts">
	import dayjs from "dayjs";

	import * as ContextMenu from "$lib/components/ui/context-menu";
	import * as Tooltip from "$lib/components/ui/tooltip";

	import {
		getInteractionContext,
	} from "$lib/interaction/context.svelte";
	import {
		calculateTopOffset2,
		calculateEventHeight,
	} from "./geometry";
	import type { Event } from "$lib/states/meta/event.svelte";
	import type { Task } from "$lib/states/meta/task.svelte";
	import { CornerLeftUp, Redo2 } from "@lucide/svelte";
	import { fade } from "svelte/transition";
	import {
		useEventInteract,
		type UseEventInteractParams,
	} from "./useEventInteract.svelte";

	interface Props {
		dayHeight: number;
		dayWidth: number;
		event: Event;
		task: Task;
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

	const { focus } = getInteractionContext();

	let container: HTMLDivElement;

	const highlight = $derived(focus.highlight[event.id]);
	const focusMe = $derived(focus.focusing[event.id] || false);
	$effect(() => {
		if (focusMe) {
			container.scrollIntoView({
				behavior: "smooth",
				inline: "center",
				block: "center",
			});
			focus.focusing[event.id] = false;
		}
	});
	let parentTasks = task.parents;

	// 定位坐标: 移动过程中会被即时值替换
	// 如果外部改动了, 也会自动刷新
	let topOffset = $state(
		calculateTopOffset2(event.start, offsetByHour, dayHeight),
	); // 单位px
	let eventHeight = $state(
		calculateEventHeight(event.start, event.end, dayHeight),
	); // 单位px
	let columnIndex = $state(getColumnIndex(event.start));
	// 仅用于事件的展示, 在移动过程中会被offsetTop的即时值替换
	let previewStart = $state(event.start);
	let previewEnd = $state(event.end);
	let clickCount = $state(0);
	let isResizing = $state(false);

	$effect(() => {
		topOffset = calculateTopOffset2(event.start, offsetByHour, dayHeight);
		eventHeight = calculateEventHeight(event.start, event.end, dayHeight);
		columnIndex = getColumnIndex(event.start);
		previewStart = event.start;
		previewEnd = event.end;
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

	const interactParams: UseEventInteractParams = {
		event,
		task,
		getDayHeight: () => dayHeight,
		getSnapsOffset: () => snapsOffset,
		getColumnIndex,
		getTopOffset: () => topOffset,
		getEventHeight: () => eventHeight,
		setTopOffset: (v) => (topOffset = v),
		setEventHeight: (v) => (eventHeight = v),
		setColumnIndex: (v) => (columnIndex = v),
		setPreviewStart: (v) => (previewStart = v),
		setPreviewEnd: (v) => (previewEnd = v),
		setIsResizing: (v) => (isResizing = v),
		bumpClickCount: () => ++clickCount,
	};
</script>

<div
	bind:this={container}
	use:useEventInteract={interactParams}
	style:z-index="8"
	style:padding="2px"
	class="border-1 z-10 absolute w-full ease-out grow-0 hover:opacity-90 overflow-visible text-sm text-zinc-50 opacity-75"
	style:grid-row="3"
	style:transition-property="transform, opacity"
	style:transition-duration="150ms"
	style:grid-column="{columnIndex + 2} / {columnIndex + 2}"
	style:transform="translateY({topOffset}px) {highlight ? 'scale(1.10)' : ''}"
	style:height="{eventHeight}px"
>
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={0}>
			<Tooltip.Trigger class="h-full w-full">
				<ContextMenu.Root>
					<ContextMenu.Trigger
						class="flex h-full p-2  rounded-lg w-full relative flex-col text-left overflow-clip {task.isCompleted
							? 'bg-zinc-400'
							: 'bg-zinc-600'} {highlight
							? ' shadow-2xl shadow-zinc-700'
							: ''}"
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
									{task.$text}
								</div>
								<div class=" text-xs pb-3 font-extralight">
									{dayjs(previewStart).format("HH:mm")}
									-
									{dayjs(previewEnd).format("HH:mm")}
								</div>
								{#each parentTasks as parentTask}
									<p
										class=" text-xs whitespace-nowrap overflow-hidden text-ellipsis font-extralight inline w-full"
									>
										<Redo2 class="inline" size="10" />
										{parentTask.$text}
									</p>
								{/each}
							</div>
						{/if}
					</ContextMenu.Trigger>
					<ContextMenu.Content>
						<ContextMenu.Item onclick={() => event.delete()}>
							删除
						</ContextMenu.Item>
					</ContextMenu.Content>
				</ContextMenu.Root>
			</Tooltip.Trigger>
			<Tooltip.Content class="p-2 z-20 max-w-60 " sideOffset={8}>
				{#each parentTasks as parentTask}
					<p class="text-xs inline">
						<Redo2 class="inline" size="10" />
						{parentTask.$text}
					</p>
				{/each}

				<div class="break-words font-semibold">
					{task.$text}
				</div>

				<p
					class=" pt-2 text-nowrap text-zinc-500 whitespace-pre-line overflow-hidden overflow-ellipsis"
				>
					{task.$note}
				</p>

				<div class=" pt-2 text-xs font-extralight">
					{dayjs(previewStart).format("HH:mm")}
					-
					{dayjs(previewEnd).format("HH:mm")}
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>
