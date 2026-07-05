/**
 * 事件块交互控制器
 *
 * 管理单个事件块（EventSegment）的拖拽/缩放/点击交互状态。
 * 同时提供 `action` Svelte Action 绑定 interactjs DOM 事件，
 * 所有计算逻辑在本控制器内处理，使其可脱离 DOM 进行单元测试。
 *
 * 使用方式：
 *   EventSegment.svelte 创建控制器实例，通过 $effect 同步 segment 变化，
 *   `use:controller.action` 绑定 interactjs 交互。
 *
 * 交互行为：
 * | 操作 | 行为 |
 * |------|------|
 * | 拖拽移动 | 实时更新预览位置，15 分钟对齐，结束时调用 `event.moveTo(newStart)` 整体平移 |
 * | 底部缩放 | 仅 `isLast` 的 segment 可缩放，结束时调用 `event.resizeTo(duration)` |
 * | 点击 | 通过 `onTapAction` 回调通知视图层 (单击跳转+高亮对应 Todo) |
 *
 * 跨天拖拽：通过 `dragOffset = segStart - event.start` 将鼠标位置还原为事件实际 start，
 * `event.moveTo()` 整体平移后其他 segment 由布局引擎自动跟随。
 */
import type { Action } from "svelte/action";
import dayjs from "dayjs";
import interact from "interactjs";

import { MS_PER_DAY } from "../segment_layout/config";
import {
	calculateTopOffset,
	calculateEventHeight,
	roundToNearest15MinutesPixels,
} from "../segment_layout/geometry";
import type { Event } from "$lib/states/meta/event.svelte";
import type { Task } from "$lib/states/meta/task.svelte";

/**
 * EventSegment 的可变交互状态。
 * 拖拽/缩放时由控制器的 onXxx 方法直接修改，视图通过 $state 响应式读取。
 */
export interface EventInteractState {
	/** 事件块在日列内的垂直偏移（px） */
	topOffset: number;
	/** 事件块高度（px） */
	eventHeight: number;
	/** 当前所在日列索引（拖拽跨天时变化） */
	columnIndex: number;
	/** 预览起始时间戳（拖拽/缩放过程中实时更新） */
	previewStart: number;
	/** 预览结束时间戳（拖拽/缩放过程中实时更新） */
	previewEnd: number;
	/** 是否正在缩放（控制 UI 切换到缩放预览模式） */
	isResizing: boolean;
}

export class EventSegmentController {
	/** 交互状态（$state，视图直接读取渲染） */
	readonly state = $state<EventInteractState>({
		topOffset: 0,
		eventHeight: 0,
		columnIndex: 0,
		previewStart: 0,
		previewEnd: 0,
		isResizing: false,
	});

	// ── 上下文参数（由视图通过 updateContext 同步） ──

	private dayHeight = 0;
	private snapsOffset: number[] = [];
	private getColumnIndex: (t: number) => number = () => 0;
	private segStart = 0;

	// ── 领域数据（由视图通过 updateContext 同步，供 interactjs 回调读取） ──

	/** 底层 Event 对象（跨天事件的多个 segment 共享同一引用） */
	private event: Event | null = null;
	/** 关联的 Task（用于点击事件通知） */
	private task: Task | null = null;

	// ── 拖拽/缩放缓存（refresh 时初始化，move 时使用） ──

	/** 拖拽开始时的事件 start（用于计算 duration） */
	private preStart = 0;
	/** 事件原始时长（拖拽过程中保持不变） */
	private preDuration = 0;
	/**
	 * 拖拽偏移量：segment.segStart 与 event.start 的时间差。
	 * 跨天事件被切分为多个 segment 后，拖拽任意 segment 时，
	 * 鼠标位置对应 segStart 而非 event.start。
	 * 通过 dragOffset 可将鼠标时间还原为事件实际 start：
	 *   newEventStart = cursorTime - dragOffset
	 */
	private dragOffset = 0;
	/** 拖拽过程中的累积像素偏移（未经 snap 对齐） */
	private realTopOffset = 0;

	/**
	 * 同步上下文参数（由视图在 $effect 中调用）。
	 * 这些值随布局变化而更新，但不在 $state 中（无需触发渲染）。
	 */
	updateContext(
		dayHeight: number,
		snapsOffset: number[],
		getColumnIndex: (t: number) => number,
		segStart: number,
		event: Event,
		task: Task,
	) {
		this.dayHeight = dayHeight;
		this.snapsOffset = snapsOffset;
		this.getColumnIndex = getColumnIndex;
		this.segStart = segStart;
		this.event = event;
		this.task = task;
	}

	/**
	 * segment 变化时（布局重算/拖拽结束）重置交互状态到 segment 的初始位置。
	 * 由视图在 $effect 中调用。
	 */
	syncToSegment(
		segStart: number,
		segEnd: number,
		dayIndex: number,
		offsetByHour: number,
		dayHeight: number,
	) {
		this.state.topOffset = calculateTopOffset(segStart, offsetByHour, dayHeight);
		this.state.eventHeight = calculateEventHeight(segStart, segEnd, dayHeight);
		this.state.columnIndex = dayIndex;
		this.state.previewStart = this.event?.start ?? segStart;
		this.state.previewEnd = this.event?.end ?? segEnd;
	}

	/**
	 * 拖拽/缩放开始时缓存事件时间和偏移量。
	 * 由 eventInteract action 的 start 回调调用。
	 */
	refresh(event: Event) {
		this.preStart = event.start;
		this.preDuration = event.end - event.start;
		this.realTopOffset = this.state.topOffset;
		this.dragOffset = this.segStart - this.preStart;
	}

	// ── 缩放（仅 isLast 的 segment 可缩放，改变 event.end） ──

	onResizeStart() {
		this.state.isResizing = true;
	}

	/** 缩放移动：根据像素高度更新预览结束时间 */
	onResizeMove(heightPx: number) {
		this.state.eventHeight = heightPx;
		this.state.previewEnd = this.segStart + (heightPx / this.dayHeight) * MS_PER_DAY;
	}

	/** 缩放结束：将新结束时间写入 Yjs */
	onResizeEnd(event: Event) {
		this.state.isResizing = false;
		event.end = this.state.previewEnd;
	}

	// ── 拖拽移动（跨天拖拽 + 15 分钟对齐，改变 event.start） ──

	/**
	 * 拖拽移动：更新日列索引、垂直偏移、预览时间。
	 * @param dy           interactjs 报告的 Y 方向增量（px）
	 * @param targetDayTs  拖放目标日列的时间戳（从 dataset.dayts 读取）
	 */
	onDragMove(dy: number, targetDayTs: number) {
		this.state.columnIndex = this.getColumnIndex(targetDayTs);
		this.realTopOffset += dy;
		const newTopOffset = roundToNearest15MinutesPixels(
			this.snapsOffset,
			this.realTopOffset,
		);
		this.state.topOffset = newTopOffset;

		const cursorTime = (newTopOffset / this.dayHeight) * MS_PER_DAY + targetDayTs;
		// 还原为事件实际 start（减去 dragOffset 保持各 segment 相对关系）
		const newPreviewStart = cursorTime - this.dragOffset;
		this.state.previewStart = newPreviewStart;
		this.state.previewEnd = newPreviewStart + this.preDuration;
	}

	/** 拖拽结束：将新 start 写入 Yjs（event.moveTo 整体平移，其他 segment 自动跟随） */
	onDragEnd(event: Event, targetDayTs: number) {
		const cursorTime = (this.state.topOffset / this.dayHeight) * MS_PER_DAY + targetDayTs;
		const startTemp = dayjs(cursorTime - this.dragOffset)
			.startOf("minute")
			.valueOf();
		event.moveTo(startTemp);
	}

	// ── 点击 ──

	/** 点击回调, 由视图注入 (触发 focusTask → 高亮+滚动+展开) */
	public onTapAction: ((task: Task) => void) | null = null;

	/** 点击: 通过回调通知视图层 */
	onTap() {
		this.onTapAction?.(this.task!);
	}

	// ── Svelte Action：interactjs 绑定 ──

	/**
	 * Svelte Action：绑定 interactjs 拖拽/缩放/点击交互。
	 * 挂载在 EventSegment.svelte 根 div 上，回调委托给控制器方法。
	 * @param isLast 是否是事件的最后一个 segment（仅 last 可底部缩放）
	 */
	action: Action<HTMLElement, boolean> = (node, isLast) => {
		interact(node)
			// 底部缩放：只有事件的最后一个 segment 可缩放（改变 event.end）
			.resizable({
				invert: "reposition",
				autoScroll: false,
				enabled: isLast,
				edges: { bottom: true },
				listeners: {
					start: () => {
						this.onResizeStart();
						node.style.opacity = "50%";
					},
					move: (dragEvent) => {
						this.onResizeMove(dragEvent.rect.height);
					},
					end: () => {
						this.onResizeEnd(this.event!);
						node.style.opacity = "75%";
					},
				},
			})
			// 拖拽移动：实时更新预览位置，结束时调用 event.moveTo 整体平移
			.draggable({
				listeners: {
					start: () => {
						node.style.opacity = "50%";
						this.refresh(this.event!);
					},
					move: (dragEvent) => {
						// 从拖放目标日列的 dataset.dayts 读取时间戳
						const targetDayTs = Number(
							dragEvent.dropzone?.target?.dataset.dayts,
						);
						if (targetDayTs) {
							this.onDragMove(dragEvent.dy, targetDayTs);
						}
					},
					end: (dragEvent) => {
						node.style.opacity = "75%";
						const targetDayTs = Number(
							dragEvent.dropzone?.target?.dataset.dayts,
						);
						if (targetDayTs) {
							this.onDragEnd(this.event!, targetDayTs);
						}
					},
				},
			})
		// 点击：通过回调通知视图层
		.on("tap", () => {
			this.onTap();
		});

		return {
			/** segment 变化时更新 resize 权限（isLast 可能随拖拽位置变化） */
			update: (newIsLast: boolean) => {
				interact(node).resizable({ enabled: newIsLast });
			},
			destroy: () => {
				interact(node).unset();
			},
		};
	};
}
