/**
 * 周视图网格骨架控制器
 *
 * 周视图宏观坐标系的唯一事实来源。持有网格定义（template、尺寸）和实测尺寸
 * （dayHeight、containerWidth），通过 Svelte Action 将各组件定位到网格中的正确位置。
 *
 * 设计原则：
 * - skeleton 管"在哪里"（grid 定位），controller 管"是什么"（业务逻辑）
 * - 所有 grid-column / grid-row / subgrid / z-index 值集中在此文件
 * - 组件通过 use:skeleton.xxx 声明语义角色，无需知道具体坐标值
 *
 * 坐标系数据流：
 *   gridTemplateColumns/Rows ──→ root action ──→ 根容器 DOM
 *   dayHeight ($state) ←────── measure action ←── 拖放区 DOM (ResizeObserver)
 *   containerWidth ($state) ←── measure action ←── 拖放区 DOM
 *   dayWidth ($derived) ───────→ EventSegment (lane geometry)
 *   displayDays ($derived) ────→ DayHeader / DayGrid ({#each})
 *   getColumnIndex ($derived) ─→ EventSegment / DragPreview
 *   layers (static) ──────────→ 所有组件 (z-index)
 *
 * @see Week.svelte 中的 const skeleton = new WeekSkeletonController(dayNum)
 */

import { OFFSET_BY_HOUR, DEFAULT_DAY_NUM, SIDE_WIDTH, SIZE, DAY_HEIGHT_PX } from "../segment_layout/config";
import { calculateDisplayRange, makeGetColumnIndex } from "../segment_layout/geometry";

/**
 * Z-index 层级定义（集中管理，消除模板中的魔法数字）。
 *
 * | 层名 | 值 | 用途 |
 * |------|----|------|
 * | `nonWorkHours` | 1 | 非工作时段背景 |
 * | `gridLines` | 2 | 网格线 |
 * | `dropZone` | 7 | 拖放区 |
 * | `events` | 8 | 事件块 |
 * | `nowIndicator` | 10 | 当前时间指示线 |
 * | `nowIndicatorLabel` | 12 | 当前时间指示线标签 |
 * | `labels` | 10 | 时间轴标签 |
 * | `header` | 11 | 日期表头 |
 * | `dragPreview` | 12 | 拖拽预览块 |
 */
const LAYERS = {
	nonWorkHours: 1,
	gridLines: 2,
	dropZone: 7,
	events: 8,
	nowIndicator: 10,
	nowIndicatorLabel: 12,
	labels: 10,
	header: 11,
	dragPreview: 12,
} as const;

export class WeekSkeletonController {
	// ── 配置 ──

	/** 前后各展示 dayNum 天 + 今天（默认 10 → 共 21 天） */
	readonly dayNum!: number;
	/** 日界偏移小时数（默认 6，即 06:00 为日界） */
	readonly offsetByHour = OFFSET_BY_HOUR;

	// ── 实测尺寸（由 measure action 从 DOM 回传）──

	/** 日列高度（px），由 measure action 通过 ResizeObserver 回传 */
	dayHeight = $state(0);
	/** 容器宽度（px），由 measure action 通过 ResizeObserver 回传 */
	containerWidth = $state(0);

	// ── 派生：网格定义（唯一事实来源）──

	/** 实际显示天数 = 2 * dayNum + 1 */
	readonly displayDayNum = $derived(2 * this.dayNum + 1);
	/** CSS Grid 列模板：时间轴宽度 + 日列 × N */
	readonly gridTemplateColumns = $derived(
		`${SIDE_WIDTH}rem repeat(${this.displayDayNum}, 1fr)`,
	);
	/** CSS Grid 行模板：表头 + 全天标签 + 时间网格 */
	readonly gridTemplateRows = "auto auto 1fr";
	/** 网格固定高度（DAY_HEIGHT_PX = 1800px） */
	readonly totalHeight = DAY_HEIGHT_PX;
	/** 网格总宽度（rem） */
	readonly totalWidth = $derived(
		`${SIDE_WIDTH + SIZE * this.displayDayNum}rem`,
	);

	// ── 派生：显示范围 + 列索引函数 ──

	/** 显示范围（今天为中心，前后各 dayNum 天） */
	readonly displayRange = $derived(
		calculateDisplayRange(this.dayNum, this.offsetByHour),
	);
	/** 显示日期数组（Dayjs[]） */
	readonly displayDays = $derived(this.displayRange.displayDays);
	/** 时间戳→日列索引函数（0-based，相对于 displayStartDay） */
	readonly getColumnIndex = $derived(
		makeGetColumnIndex(this.displayRange.displayStartDay),
	);

	// ── 派生：每列像素宽度（供事件块定位使用）──

	/** 每列像素宽度 = containerWidth / displayDayNum */
	readonly dayWidth = $derived(
		Math.floor(this.containerWidth / this.displayDayNum),
	);

	static readonly layers = LAYERS;

	constructor(dayNum: number = DEFAULT_DAY_NUM) {
		this.dayNum = dayNum;
	}

	// ═══════════════════════════════════════════════════════════
	//  Svelte Actions
	//  每个 action 负责将一个 DOM 元素定位到网格中的正确位置。
	//  组件只需声明"我是什么"，无需知道 grid-column / grid-row 的具体值。
	// ═══════════════════════════════════════════════════════════

	/** 根网格容器：应用 grid template + 固定尺寸 */
	root = (node: HTMLElement) => {
		$effect(() => {
			node.style.display = "grid";
			node.style.height = `${this.totalHeight}px`;
			node.style.width = this.totalWidth;
			node.style.gridTemplateColumns = this.gridTemplateColumns;
			node.style.gridTemplateRows = this.gridTemplateRows;
		});
	};

	/** 时间轴列：col 1, 跨全行, sticky, subgrid */
	timeAxis = (node: HTMLElement) => {
		$effect(() => {
			node.style.gridColumn = "1";
			node.style.gridRow = "1 / -1";
			node.style.position = "sticky";
			node.style.left = "0";
			node.style.display = "grid";
			node.style.gridTemplateColumns = "subgrid";
			node.style.gridTemplateRows = "subgrid";
		});
	};

	/** 日期表头：cols 2+, row 1, sticky, subgrid */
	header = (node: HTMLElement) => {
		$effect(() => {
			node.style.gridColumn = "2 / -1";
			node.style.gridRow = "1";
			node.style.position = "sticky";
			node.style.top = "0";
			node.style.zIndex = String(LAYERS.header);
			node.style.display = "grid";
			node.style.gridTemplateColumns = "subgrid";
			node.style.gridTemplateRows = "subgrid";
		});
	};

	/** 全天标签：col 1, row 2 */
	allDay = (node: HTMLElement) => {
		node.style.gridColumn = "1";
		node.style.gridRow = "2";
	};

	/** 时间网格区域（带 subgrid）：cols 2+, row 3 */
	timeGrid = (node: HTMLElement) => {
		$effect(() => {
			node.style.gridColumn = "2 / -1";
			node.style.gridRow = "3";
			node.style.display = "grid";
			node.style.gridTemplateColumns = "subgrid";
			node.style.gridTemplateRows = "subgrid";
		});
	};

	/** 时间网格区域（无 subgrid，供非工作时段等自定义行网格使用） */
	timeGridArea = (node: HTMLElement) => {
		$effect(() => {
			node.style.gridColumn = "2 / -1";
			node.style.gridRow = "3";
		});
	};

	/** 测量元素尺寸 → 回传 dayHeight / containerWidth */
	measure = (node: HTMLElement) => {
		const update = () => {
			this.dayHeight = node.offsetHeight;
			this.containerWidth = node.offsetWidth;
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(node);
		return { destroy: () => ro.disconnect() };
	};

	/** 日列（在 subgrid 时间网格内，index 0-based） */
	dayColumn = (node: HTMLElement, index: number) => {
		const apply = (idx: number) => {
			node.style.gridArea = `1 / ${idx + 1} / 1 / ${idx + 1}`;
		};
		apply(index);
		return { update: apply };
	};

	/** 事件块槽位：grid-row 3, grid-column = dayIndex+2, absolute */
	eventSlot = (node: HTMLElement, dayIndex: number) => {
		node.style.gridRow = "3";
		node.style.position = "absolute";
		const apply = (idx: number) => {
			node.style.gridColumn = `${idx + 2} / ${idx + 2}`;
		};
		apply(dayIndex);
		return { update: apply };
	};

	/** 当前时间指示线容器：cols 1/-1, row 3, subgrid */
	nowIndicator = (node: HTMLElement) => {
		$effect(() => {
			node.style.gridColumn = "1 / -1";
			node.style.gridRow = "3 / -1";
			node.style.display = "grid";
			node.style.gridTemplateColumns = "subgrid";
			node.style.gridTemplateRows = "subgrid";
		});
	};
}
