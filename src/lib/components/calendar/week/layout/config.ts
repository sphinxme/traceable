/**
 * 日历配置（周视图）
 */

/** 日界偏移小时数：一天的边界不是 00:00 而是 06:00，04:00 属于前一天 */
export const OFFSET_BY_HOUR = 6;

/** 一天的毫秒数 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 从 Todo 拖入日历时创建事件的默认时长（30 分钟） */
export const DEFAULT_EVENT_DURATION_MS = 30 * 60 * 1000;

/** 像素吸附阈值：拖拽时距 15 分钟 snap 点小于此值则吸附 */
export const SNAP_THRESHOLD_PX = 6;

export const NOT_WORK_HOUR_RANGES: ReadonlyArray<{
	start: number;
	end: number;
}> = [
		{ start: 6, end: 10 },
		{ start: 12, end: 13.5 },
		{ start: 18, end: 19.5 },
		// end=30 表示次日 06:00。值可 >24，DayGrid 按 (end-offsetByHour)*2 计算 grid-row，
		// 超出 48 行的部分会被 CSS Grid 自动截断。
		{ start: 22, end: 30 },
	];
