/**
 * 周视图几何计算
 *
 * 核心概念——日界偏移（offsetByHour）：
 *   "一天"的边界不是自然日 00:00，而是 OFFSET_BY_HOUR（默认 6，即 06:00）。
 *   - 04:00 的事件属于前一天的尾部
 *   - 06:00 的事件属于当天的头部
 *   所有日界计算统一使用 getDayStart(t, offsetByHour)：
 *   先减偏移 → startOf("day") → 加回，确保 00:00~06:00 的事件归到前一日。
 *
 * 函数总览：
 * | 函数 | 说明 |
 * |------|------|
 * | `getDayStart(t, offsetByHour)` | 计算时间戳所属"日"的起始时刻（考虑偏移） |
 * | `fractionOfDay(start, end)` | 时间段占一天的比例（可 >1 用于跨天） |
 * | `calculateTopOffset(start, offsetByHour, dayHeight)` | 事件在日列内的垂直偏移（px） |
 * | `calculateEventHeight(start, end, dayHeight)` | 事件块像素高度 |
 * | `calculateDisplayRange(dayNum, offsetByHour)` | 计算显示范围（today、displayDays 等） |
 * | `makeGetColumnIndex(displayStartDay)` | 构造时间戳→日列索引的函数 |
 * | `roundToNearest15MinutesDayjs` / `roundToNearest15MinutesPixels` | 15 分钟对齐 |
 * | `range(start, stop)` | 生成闭区间整数序列（用于刻度迭代） |
 */
import dayjs, { Dayjs } from "dayjs";
import { MS_PER_DAY, SNAP_THRESHOLD_PX } from "./config";

/**
 * 计算时间段占一天（24h）的比例。
 *
 * 可返回 > 1 的值（用于跨天事件的总时长比例），
 * 也可返回 0（零时长事件）。
 *
 * 注意：此函数计算的是"绝对时长比例"，不考虑 offsetByHour 日界。
 * 调用方需自行确保 start/end 落在同一"日"内（如 segment 的 segStart/segEnd），
 * 否则结果可能 > 1。
 */
export function fractionOfDay(start: number, end: number): number {
	return (end - start) / MS_PER_DAY;
}

/** 生成 [start, stop] 闭区间整数序列 */
export function range(start: number, stop: number, step: number = 1) {
	return Array.from(
		{ length: Math.floor((stop - start) / step + 1) },
		(_, i) => start + i * step,
	);
}

/** 将时间戳对齐到最近的 15 分钟整点 */
export function roundToNearest15MinutesDayjs(time: Dayjs): Dayjs {
	const minutes = time.minute();
	const remainder = minutes % 15;
	let roundedMinutes = minutes;
	if (remainder < 7.5) {
		roundedMinutes -= remainder;
	} else {
		roundedMinutes += 15 - remainder;
	}
	return time.minute(roundedMinutes).second(0).millisecond(0);
}

/**
 * 将像素偏移吸附到最近的 15 分钟 snap 点。
 * snapsOffset 为所有 15 分钟刻度对应的像素位置数组。
 */
export function roundToNearest15MinutesPixels(
	snapsOffset: number[],
	offset: number,
): number {
	for (const snap of snapsOffset) {
		if (Math.abs(offset - snap) < SNAP_THRESHOLD_PX) {
			return snap;
		}
	}
	return offset;
}

/**
 * 创建一个列索引计算函数：给定时间戳返回其所属日列的索引。
 * 索引相对于 displayStartDay，0-based。
 */
export function makeGetColumnIndex(displayStartDay: Dayjs) {
	return (t: number) => dayjs(t).diff(displayStartDay, "day");
}

/**
 * 计算时间戳 t 所属"日"的起始时刻（考虑 offsetByHour 偏移）。
 *
 * 核心日界逻辑：先减 offsetByHour → startOf("day") → 加回 offsetByHour。
 * 例如 offsetByHour=6 时：
 *   t = 04:00 → 昨天 06:00（属于前一天）
 *   t = 08:00 → 今天 06:00（属于当天）
 */
export function getDayStart(t: number, offsetByHour: number): Dayjs {
	return dayjs(t)
		.add(-offsetByHour, "hour")
		.startOf("day")
		.add(offsetByHour, "hour");
}

/**
 * 计算事件在日列内的垂直偏移（px）。
 *
 * 通过 getDayStart 修正日界（先减 offsetByHour 再 startOf("day") 再加回），
 * 确保 00:00~06:00 的事件被归到前一日，不会产生负偏移。
 */
export function calculateTopOffset(
	start: number,
	offsetByHour: number,
	dayHeight: number,
): number {
	const dayStart = getDayStart(start, offsetByHour).valueOf();
	return Math.floor(fractionOfDay(dayStart, start) * dayHeight);
}

/**
 * 计算事件块的像素高度。
 *
 * 注意：传入的 start/end 应为同一日列内的值（如 segment.segStart/segEnd），
 * 否则跨天事件会得到 > dayHeight 的高度。
 */
export function calculateEventHeight(
	start: number,
	end: number,
	dayHeight: number,
): number {
	return Math.floor(fractionOfDay(start, end) * dayHeight);
}

/** 周视图的显示范围信息 */
export interface DisplayRange {
	today: Dayjs;
	displayDayNum: number;
	displayStartDay: Dayjs;
	displayEndDay: Dayjs;
	displayDays: Dayjs[];
}

/**
 * 计算周视图的显示范围。
 * 以今天为中心，前后各展示 dayNum 天，共 2*dayNum+1 天。
 */
export function calculateDisplayRange(
	dayNum: number,
	offsetByHour: number,
): DisplayRange {
	const today = dayjs().startOf("day").add(offsetByHour, "hour");
	return {
		today,
		displayDayNum: 2 * dayNum + 1,
		displayStartDay: today.subtract(dayNum, "day"),
		displayEndDay: today.add(dayNum, "day"),
		displayDays: range(-dayNum, dayNum).map((i) => today.add(i, "day")),
	};
}
