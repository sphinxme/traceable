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
 * ## 宏观网格结构
 *
 * 根容器是一个 (1+displayDayNum) 列 × 3 行的 CSS Grid：
 *
 * | 行 \ 列       | Col 1 (4rem)  | Col 2~N+1 (1fr × N) |
 * |--------------|--------------|---------------------|
 * | Row 1 (auto) | —            | 日期表头 (DayHeader) |
 * | Row 2 (auto) | "全天" 标签   | —                   |
 * | Row 3 (1fr)  | 左侧时间轴    | 时间网格 (DayGrid)   |
 *
 * - Col 1 固定 4rem（SIDE_WIDTH）为左侧时间轴
 * - Col 2+ 等分为 N 个日列（默认 N=21，前后各 10 天 + 今天）
 * - Row 3 占满剩余高度（固定 DAY_HEIGHT_PX=1800px），24h 纵向展开
 *
 * ## 三层定位模型
 *
 * 事件块的定位分三层，从宏观到微观，每层回答一个问题：
 *
 * | 层 | 回答的问题 | 机制 | 负责人 | 样式属性 |
 * |----|-----------|------|--------|---------|
 * | 1  | 在哪一天   | CSS Grid | eventSlot action | grid-column, grid-row, position:absolute |
 * | 2  | 在什么时间 | 像素偏移 | EventSegmentController | translateY, height |
 * | 3  | 重叠并排   | lane 几何 | getLaneGeometry | width, left |
 *
 * 第 1 层由本控制器的 `eventSlot` action 完成，将事件块放到正确的日列（grid cell）。
 * `position:absolute` 使事件块脱离 grid 流，允许第 2~3 层在 cell 内自由偏移。
 * 第 2 层通过 `fractionOfDay × dayHeight` 将时间比例转为像素，第 3 层通过
 * `dayWidth / laneCount` 计算并排宽度。dayHeight/dayWidth 均由 `measure` action 实测。
 *
 * ## Subgrid 机制
 *
 * 子容器通过 `grid-template-columns: subgrid`（和/或 `rows: subgrid`）继承父网格的
 * 轨道定义，使得跨越多列的子容器内部仍能精确对齐到父网格的列线，无需重复声明列宽。
 * 子元素通过配套的行/列放置 action（timeAxisRow / dayColumn / nonWorkHourSlot /
 * nowIndicatorLabel）定位到 subgrid 内的具体位置，组件无需知道坐标值。
 *
 * | 容器 Action | 子元素放置 Action | subgrid 用途 |
 * |-------------|-------------------|-------------|
 * | timeAxis | timeAxisRow | col 1 全行，子元素按行对齐（全天标签/小时刻度） |
 * | header | dayColumn | col 2+，日期表头每天对齐到一列 |
 * | timeGrid | dayColumn | col 2+ row 3，拖放区日列对齐到父网格列 |
 * | nowIndicator | nowIndicatorLabel | col 1/-1 row 3，时间线贯穿全宽，标签定位到日列 |
 * | timeGridArea | nonWorkHourSlot | cols 2+ row 3，自定义 48 行子网格（30 分钟粒度） |
 *
 * 坐标系数据流：
 *   gridTemplateColumns/Rows ──→ root action ──→ 根容器 DOM
 *   dayHeight ($state) ←────── measure action ←── 拖放区 DOM (ResizeObserver)
 *   containerWidth ($state) ←── measure action ←── 拖放区 DOM
 *   dayWidth ($derived) ───────→ EventSegment (lane geometry)
 *   displayDays ($derived) ────→ DayHeader / DayGrid ({#each})
 *   getColumnIndex ($derived) ─→ EventSegment / DragPreview / NowIndicator
 *   layers (static) ──────────→ 所有组件 (z-index)
 *   rows (static) ────────────→ DayGrid (timeAxisRow 行号)
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

/**
 * 父网格行号定义（集中管理，消除组件中的行号魔法数字）。
 *
 * | 行名 | 值 | 用途 |
 * |------|----|------|
 * | `header` | 1 | 日期表头 |
 * | `allDay` | 2 | "全天" 标签 |
 * | `timeGrid` | 3 | 时间网格 |
 */
const ROWS = {
	header: 1,
	allDay: 2,
	timeGrid: 3,
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
	static readonly rows = ROWS;

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

	/** 时间轴行（在 timeAxis subgrid 内，按行号定位子元素）
	 *  timeAxis 通过 subgrid 继承父网格行轨道，本 action 将子元素放到指定行。
	 *  行号使用 WeekSkeletonController.rows 常量，消除魔法数字。 */
	timeAxisRow = (node: HTMLElement, rowIndex: number) => {
		const apply = (idx: number) => {
			node.style.gridArea = `${idx} / 1`;
		};
		apply(rowIndex);
		return { update: apply };
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

	/** 时间网格区域（带 subgrid）：cols 2+, row 3
	 *  继承父网格列轨道，内部日列通过 dayColumn action 对齐到各列。
	 *  skeleton.measure 挂载于此以实测 dayHeight / containerWidth。 */
	timeGrid = (node: HTMLElement) => {
		$effect(() => {
			node.style.gridColumn = "2 / -1";
			node.style.gridRow = "3";
			node.style.display = "grid";
			node.style.gridTemplateColumns = "subgrid";
			node.style.gridTemplateRows = "subgrid";
		});
	};

	/** 时间网格区域（无 subgrid）：cols 2+, row 3, 自定义 48 行子网格
	 *  不继承父网格行轨道，而是定义 48 行（30 分钟粒度 = 24h × 2）子网格，
	 *  供非工作时段背景通过 nonWorkHourSlot action 精确定位。 */
	timeGridArea = (node: HTMLElement) => {
		$effect(() => {
			node.style.gridColumn = "2 / -1";
			node.style.gridRow = "3";
			node.style.display = "grid";
			node.style.gridTemplateRows = "repeat(48, 1fr)";
		});
	};

	/** 非工作时段槽位：在 timeGridArea 的 48 行子网格内按小时计算 grid-row
	 *  行号公式：(hour - offsetByHour) * 2 + 1，值可 >48 由 CSS 自动截断。 */
	nonWorkHourSlot = (node: HTMLElement, range: { start: number; end: number }) => {
		const apply = (r: { start: number; end: number }) => {
			const startRow = (r.start - this.offsetByHour) * 2 + 1;
			const endRow = (r.end - this.offsetByHour) * 2 + 1;
			node.style.gridRow = `${startRow} / ${endRow}`;
		};
		apply(range);
		return { update: apply };
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

	/** 日列（在 subgrid 容器内，index 0-based）
	 *  通过 grid-area 定位到 subgrid 继承的第 index+1 列，确保与父网格列线对齐。 */
	dayColumn = (node: HTMLElement, index: number) => {
		const apply = (idx: number) => {
			node.style.gridArea = `1 / ${idx + 1} / 1 / ${idx + 1}`;
		};
		apply(index);
		return { update: apply };
	};

	/** 事件块槽位：grid-row 3, grid-column = dayIndex+2, position:absolute
	 *  三层定位模型的第 1 层（Grid 定位）：将事件块放到正确的日列。
	 *  position:absolute 使事件块脱离 grid 流，允许第 2~3 层的像素级定位
	 *  （translateY/height/width/left）在 grid cell 内自由偏移。 */
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

	/** 当前时间指示线标签：在 nowIndicator subgrid 内定位到指定日列
	 *  nowIndicator 继承所有父列（含 col 1 时间轴），日列从 col 2 开始，
	 *  因此 grid-column = dayIndex + 2。 */
	nowIndicatorLabel = (node: HTMLElement, dayIndex: number) => {
		const apply = (idx: number) => {
			node.style.gridColumn = `${idx + 2} / ${idx + 2}`;
		};
		apply(dayIndex);
		return { update: apply };
	};
}
