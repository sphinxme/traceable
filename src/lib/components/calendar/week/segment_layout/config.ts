/**
 * 周视图配置常量与业务规则
 *
 * 定义日界、时间、尺寸、显示及交互等常量，被 geometry.ts、layout.ts、
 * WeekController、WeekSkeletonController 等引用。
 *
 * 主要常量：
 * - `DEFAULT_DAY_NUM` — 前后各展示 dayNum 天 + 今天（默认 10 → 共 21 天）
 * - `SIDE_WIDTH` — 左侧时间轴宽度（rem）
 * - `SIZE` — 每列宽度基数（rem），总宽 = SIDE_WIDTH + SIZE * displayDayNum
 * - `DAY_HEIGHT_PX` — 日历网格固定高度（px），24h 均分
 * - `OFFSET_BY_HOUR` — 日界偏移小时数（默认 6，即 06:00 为日界）
 * - `MS_PER_DAY` — 一天的毫秒数
 * - `DEFAULT_EVENT_DURATION_MS` — 从 Todo 拖入时创建事件的默认时长（30 分钟）
 * - `SNAP_THRESHOLD_PX` — 拖拽吸附阈值（px）
 * - `NOT_WORK_HOUR_RANGES` — 非工作时段范围（值可 >24 表示次日）
 */

import type { Dayjs } from "dayjs";

// ── 尺寸/显示常量 ──

/** 前后各展示 dayNum 天 + 今天，默认 10 → 共 21 天 */
export const DEFAULT_DAY_NUM = 10;

/** 左侧时间轴宽度（rem） */
export const SIDE_WIDTH = 4;

/** 每列宽度基数（rem），总宽 = SIDE_WIDTH + SIZE * displayDayNum */
export const SIZE = 7;

/** 日历网格固定高度（px），24h 均分 */
export const DAY_HEIGHT_PX = 1800;

// ── 时间/布局常量 ──

/** 日界偏移小时数：一天的边界不是 00:00 而是 06:00，04:00 属于前一天 */
export const OFFSET_BY_HOUR = 6;

/** 一天的毫秒数 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 从 Todo 拖入日历时创建事件的默认时长（30 分钟） */
export const DEFAULT_EVENT_DURATION_MS = 30 * 60 * 1000;

/** 像素吸附阈值：拖拽时距 15 分钟 snap 点小于此值则吸附 */
export const SNAP_THRESHOLD_PX = 6;

// ── 业务规则 ──

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

/** 判断是否为休息日（仅周六，周日不标记） */
export function isRestDay(day: Dayjs) {
	return day.day() == 6;
}
