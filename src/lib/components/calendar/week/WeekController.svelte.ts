/**
 * 周视图控制器
 *
 * 持有周视图的全部状态和业务逻辑，Week.svelte 仅负责渲染。
 * 通过 $derived 响应式驱动：Yjs 数据变更 → Store 触发 Svelte 更新 →
 * 筛选与布局引擎重新计算 → UI 自动刷新。
 *
 * 生命周期：
 *   Week.svelte 在 $effect 中调用 onReady() / destroy()
 *   onReady  → 启动 now indicator 定时器 + 恢复滚动位置
 *   destroy  → 停止定时器 + 移除 scroll 监听器
 */
import dayjs, { type Dayjs } from "dayjs";
import { list } from "radash";

import {
	OFFSET_BY_HOUR,
	MS_PER_DAY,
	DEFAULT_EVENT_DURATION_MS,
} from "./layout/config";
import {
	calculateDisplayRange,
	makeGetColumnIndex,
	roundToNearest15MinutesDayjs,
} from "./layout/geometry";
import { layoutEvents } from "./layout/layout";
import { DEFAULT_DAY_NUM, SIDE_WIDTH, SIZE } from "./week-config";
import { getInteractionContext } from "$lib/interaction/context.svelte";
import type { Store } from "$lib/states/meta/store.svelte";
import type { Task } from "$lib/states/meta/task.svelte";

/** 从 Todo 拖入日历时的预览事件时间范围 */
export interface DraggingTaskEvent {
	start: number;
	end: number;
}

export class WeekController {
	// ── 依赖注入（构造器赋值，! 表示确定赋值断言） ──

	/** Yjs 数据层，唯一事实来源 */
	readonly store!: Store;
	/** 前后各展示 dayNum 天 + 今天，默认 10 → 共 21 天 */
	readonly dayNum!: number;
	/** 日界偏移小时数（06:00 为日界） */
	readonly offsetByHour = OFFSET_BY_HOUR;

	// ── 可变状态（$state，由视图通过 bind 回传或交互更新） ──
	// 注意：必须在引用它们的 $derived 字段之前声明

	/** 日列高度（px），由 DayGrid 通过 bind:offsetHeight 回传 */
	dayHeight = $state(0);
	/** 容器宽度（px），由 DayGrid 通过 bind:offsetWidth 回传 */
	containerWidth = $state(0);
	/** 滚动容器引用，由 ScrollArea 通过 bind:ref 回传 */
	scrollAreaRef = $state<HTMLElement | null>(null);
	/** 从 Todo 拖入时的预览事件（null 表示无拖入） */
	draggingTaskEvent = $state<DraggingTaskEvent | null>(null);
	/** 当前时间指示线的百分比位置（0~100，基于 offsetByHour 日界） */
	nowPercentage = $state(0);

	// ── 派生状态（$derived，依赖变化时自动重算） ──

	/** 显示范围：以今天为中心，前后各 dayNum 天 */
	readonly displayRange = $derived(
		calculateDisplayRange(this.dayNum, this.offsetByHour),
	);

	/** 时间戳 → 日列索引的函数（相对于 displayStartDay，0-based） */
	readonly getColumnIndex = $derived(
		makeGetColumnIndex(this.displayRange.displayStartDay),
	);

	/** 从 Store 查询显示范围内的事件（Yjs 数据变更时自动重新查询） */
	readonly events = $derived(
		this.store.queryEventsByRange(
			this.displayRange.displayStartDay.valueOf(),
			this.displayRange.displayEndDay.valueOf(),
		),
	);

	/**
	 * 布局引擎输出：将 events 切分为 per-day segments 并做重叠分列。
	 * 每个 PositionedSegment 对应一个 WeekEvent 实例。
	 * 跨天事件会产生多个 segment，重叠事件会分配到不同 lane。
	 */
	readonly positionedSegments = $derived(
		layoutEvents(
			this.events.filter((e) => e.task),
			this.displayRange.displayStartDay,
			this.displayRange.displayEndDay,
			this.offsetByHour,
		),
	);

	/** 每列像素宽度（用于事件块定位） */
	readonly dayWidth = $derived(
		Math.floor(this.containerWidth / this.displayRange.displayDayNum),
	);

	/**
	 * 15 分钟 snap 点的像素偏移数组（共 97 个，0~96 * piece）。
	 * 用于拖拽时吸附到 15 分钟整点。
	 */
	readonly snapsOffset = $derived.by(() => {
		const pieceNum = 24 * 4;
		const piece = this.dayHeight / pieceNum;
		return list(0, pieceNum, (i) => i * piece);
	});

	// ── 私有：定时器与清理 ──

	private nowTimerId: ReturnType<typeof setTimeout> | undefined;
	private nowRafId = 0;
	private scrollCleanup: (() => void) | null = null;
	private readonly scroll: ReturnType<typeof getInteractionContext>["scroll"];

	constructor(store: Store, dayNum: number = DEFAULT_DAY_NUM) {
		this.store = store;
		this.dayNum = dayNum;
		this.scroll = getInteractionContext().scroll;
	}

	// ── 生命周期 ──

	/** 组件就绪后调用：启动 now indicator + 恢复滚动位置 */
	onReady() {
		this.startNowIndicator();
		this.setupScrollRestore();
	}

	/** 组件卸载时调用：停止定时器 + 移除监听器 */
	destroy() {
		this.stopNowIndicator();
		this.scrollCleanup?.();
	}

	// ── 当前时间指示线 ──

	/** 计算当前时间在"日"内的百分比位置（06:00 = 0%, 次日 06:00 = 100%） */
	private updateNowPercentage() {
		const now = dayjs();
		const startOfDay = now.startOf("day").add(this.offsetByHour, "hour");
		this.nowPercentage = (now.diff(startOfDay) / MS_PER_DAY) * 100;
	}

	/** 每 10 秒更新一次位置（setTimeout + requestAnimationFrame） */
	private startNowIndicator() {
		const animate = () => {
			this.updateNowPercentage();
			this.nowTimerId = setTimeout(() => {
				this.nowRafId = requestAnimationFrame(animate);
			}, 10000);
		};
		animate();
	}

	/** 停止更新，清除 setTimeout 和 requestAnimationFrame */
	private stopNowIndicator() {
		cancelAnimationFrame(this.nowRafId);
		clearTimeout(this.nowTimerId);
	}

	// ── 滚动位置记忆 ──

	/**
	 * 恢复上次滚动位置，并监听 scroll 事件持续持久化。
	 * 通过 InteractionContext 的 ScrollMemoryService 存储。
	 */
	private setupScrollRestore() {
		if (!this.scrollAreaRef) return;
		const ref = this.scrollAreaRef;
		const key = "weekPanel";

		if (this.scroll.weekPanel[key]) {
			ref.scrollTo({
				top: this.scroll.weekPanel[key].scrollTop,
				left: this.scroll.weekPanel[key].scrollLeft,
				behavior: "instant",
			});
		} else {
			this.scrollToToday();
		}

		const update = () => {
			this.scroll.weekPanel[key] = {
				scrollTop: ref.scrollTop,
				scrollLeft: ref.scrollLeft,
			};
		};

		ref.addEventListener("scroll", update);
		this.scrollCleanup = () => ref.removeEventListener("scroll", update);
	}

	/**
	 * 首次加载（无滚动记忆）时水平滚动到今天的日列并居中。
	 * 使用网格几何常量（SIDE_WIDTH / SIZE）计算像素位置，不依赖 containerWidth。
	 */
	private scrollToToday() {
		const ref = this.scrollAreaRef;
		if (!ref) return;

		requestAnimationFrame(() => {
			const rem = parseFloat(
				getComputedStyle(document.documentElement).fontSize,
			);
			const sideWidthPx = SIDE_WIDTH * rem;
			const dayWidthPx = SIZE * rem;
			const todayIndex = this.dayNum;
			const todayLeft = sideWidthPx + todayIndex * dayWidthPx;
			const scrollTarget = todayLeft - (ref.clientWidth - dayWidthPx) / 2;
			ref.scrollTo({
				left: Math.max(0, scrollTarget),
				behavior: "smooth",
			});
		});
	}

	// ── 从 Todo 拖入：像素 → 时间转换 + 事件创建 ──

	/**
	 * 将日列内的像素偏移转换为时间戳。
	 * 先定位到日界（offsetByHour），再按像素比例换算为毫秒偏移。
	 */
	private pixelsToTime(day: Dayjs, topPx: number): Dayjs {
		return day
			.startOf("day")
			.add(this.offsetByHour, "hour")
			.add((topPx / this.dayHeight) * MS_PER_DAY, "milliseconds");
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
