/**
 * 周视图控制器
 *
 * 持有周视图的业务逻辑（事件查询、布局、交互），Week.svelte 仅负责渲染。
 * 坐标系相关状态（网格定义、实测尺寸、显示范围）委托给 WeekSkeletonController。
 * 定时器逻辑（当前时间指示线）委托给 NowIndicatorTimer。
 * 滚动位置记忆委托给 ScrollRestoreService。
 *
 * 数据流：
 *   Store（Yjs，唯一事实来源）
 *     → events             $derived: queryEventsByRange(skeleton.displayRange)
 *     → positionedSegments $derived: layoutEvents() 按日界切分 + 重叠分列
 *     → Week.svelte {#each} 渲染 WeekEvent（由 skeleton.eventSlot 定位）
 *
 *   用户交互（拖拽/缩放）产生的修改直接写回 Store（即 Yjs），
 *   Yjs 数据变更触发 Svelte 更新 → 筛选与布局引擎重新计算 → UI 自动刷新。
 *
 * 生命周期：
 *   Week.svelte 在 $effect 中调用 onReady() / destroy()
 *   onReady  → 启动 now indicator 定时器 + 恢复滚动位置
 *   destroy  → 停止定时器 + 移除 scroll 监听器
 */
import type { Dayjs } from "dayjs";
import { list } from "radash";

import { MS_PER_DAY, DEFAULT_EVENT_DURATION_MS } from "./segment_layout/config";
import { roundToNearest15MinutesDayjs } from "./segment_layout/geometry";
import { layoutEvents } from "./segment_layout/layout";
import type { WeekSkeletonController } from "./skeleton/WeekSkeletonController.svelte";
import { NowIndicatorTimer } from "./skeleton/now_indicator/NowIndicatorTimer.svelte";
import { ScrollRestoreService } from "./ScrollRestoreService.svelte";
import type { Store } from "$lib/states/meta/store.svelte";
import type { Task } from "$lib/states/meta/task.svelte";

/** 从 Todo 拖入日历时的预览事件时间范围 */
export interface DraggingTaskEvent {
	start: number;
	end: number;
}

export class WeekController {
	// ── 依赖注入 ──

	/** Yjs 数据层，唯一事实来源 */
	readonly store!: Store;
	/** 网格骨架控制器（坐标系唯一事实来源） */
	readonly skeleton!: WeekSkeletonController;

	// ── 委托服务 ──

	private readonly nowIndicator: NowIndicatorTimer;
	private readonly scrollRestore: ScrollRestoreService;

	// ── 可变状态（$state，由视图通过 bind 回传或交互更新）──

	/** 滚动容器引用，由 ScrollArea 通过 bind:ref 回传 */
	scrollAreaRef = $state<HTMLElement | null>(null);
	/** 从 Todo 拖入时的预览事件（null 表示无拖入） */
	draggingTaskEvent = $state<DraggingTaskEvent | null>(null);

	// ── 派生状态（$derived，依赖变化时自动重算）──

	/** 从 Store 查询显示范围内的事件（Yjs 数据变更时自动重新查询） */
	readonly events = $derived(
		this.store.queryEventsByRange(
			this.skeleton.displayRange.displayStartDay.valueOf(),
			this.skeleton.displayRange.displayEndDay.valueOf(),
		),
	);

	/**
	 * 布局引擎输出：将 events 切分为 per-day segments 并做重叠分列。
	 * 每个 PositionedSegment 对应一个 WeekEvent 实例。
	 */
	readonly positionedSegments = $derived(
		layoutEvents(
			this.events.filter((e) => e.task),
			this.skeleton.displayRange.displayStartDay,
			this.skeleton.displayRange.displayEndDay,
			this.skeleton.offsetByHour,
		),
	);

	/**
	 * 15 分钟 snap 点的像素偏移数组（共 97 个，0~96 * piece）。
	 * 用于拖拽时吸附到 15 分钟整点。
	 */
	readonly snapsOffset = $derived.by(() => {
		const pieceNum = 24 * 4;
		const piece = this.skeleton.dayHeight / pieceNum;
		return list(0, pieceNum, (i) => i * piece);
	});

	/** 当前时间指示线的百分比位置（委托给 NowIndicatorTimer） */
	get nowPercentage() {
		return this.nowIndicator.nowPercentage;
	}

	constructor(store: Store, skeleton: WeekSkeletonController) {
		this.store = store;
		this.skeleton = skeleton;
		this.nowIndicator = new NowIndicatorTimer(skeleton.offsetByHour);
		this.scrollRestore = new ScrollRestoreService(skeleton);
	}

	// ── 生命周期 ──

	/** 组件就绪后调用：启动 now indicator + 恢复滚动位置 */
	onReady() {
		this.nowIndicator.start();
		this.scrollRestore.setup(this.scrollAreaRef);
	}

	/** 组件卸载时调用：停止定时器 + 移除监听器 */
	destroy() {
		this.nowIndicator.stop();
		this.scrollRestore.destroy();
	}

	// ── 从 Todo 拖入：像素 → 时间转换 + 事件创建 ──

	/**
	 * 将日列内的像素偏移转换为时间戳。
	 * 先定位到日界（offsetByHour），再按像素比例换算为毫秒偏移。
	 */
	private pixelsToTime(day: Dayjs, topPx: number): Dayjs {
		return day
			.startOf("day")
			.add(this.skeleton.offsetByHour, "hour")
			.add(
				(topPx / this.skeleton.dayHeight) * MS_PER_DAY,
				"milliseconds",
			);
	}

	/** 从 Todo 拖入：拖拽悬停时更新预览块位置（30 分钟默认时长，15 分钟对齐） */
	handleDragOver(day: Dayjs, _task: Task, topPx: number) {
		let start = this.pixelsToTime(day, topPx);
		start = roundToNearest15MinutesDayjs(start);
		this.draggingTaskEvent = {
			start: start.valueOf(),
			end: start.valueOf() + DEFAULT_EVENT_DURATION_MS,
		};
	}

	/** 从 Todo 拖入：释放时创建新事件并写入 Store */
	handleDrop(day: Dayjs, task: Task, topPx: number) {
		let start = this.pixelsToTime(day, topPx);
		start = roundToNearest15MinutesDayjs(start);
		task.insertEvent(
			start.valueOf(),
			start.add(DEFAULT_EVENT_DURATION_MS, "milliseconds").valueOf(),
		);
		this.draggingTaskEvent = null;
	}

	/** 从 Todo 拖入：拖拽离开/取消时清除预览 */
	handleDragEnd() {
		this.draggingTaskEvent = null;
	}
}
