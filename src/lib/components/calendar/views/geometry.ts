import dayjs, { Dayjs } from "dayjs";

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
export function percent(start: number, end: number) {
	return (end - start) / (24 * 60 * 60 * 1000);
}

export function range(start: number, stop: number, step: number = 1) {
	return Array.from(
		{ length: (stop - start) / step + 1 },
		(_, i) => start + i * step,
	);
}

export function isRestDay(day: Dayjs) {
	return day.day() == 6;
}

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

export function roundToNearest15MinutesPixels(
	snapsOffset: number[],
	offset: number,
): number {
	for (const snap of snapsOffset) {
		if (Math.abs(offset - snap) < 6) {
			return snap;
		}
	}
	return offset;
}

export function makeGetColumnIndex(displayStartDay: Dayjs) {
	return (t: number) => dayjs(t).diff(displayStartDay, "day");
}

export function calculateTopOffset(
	start: number,
	offsetByHour: number,
	dayHeight: number,
): number {
	const startOfDay = dayjs(start)
		.startOf("day")
		.add(offsetByHour, "hour");
	return Math.floor(percent(startOfDay.valueOf(), start) * dayHeight);
}

/**
 * 计算事件在日列内的垂直偏移（px）。
 *
 * 与 calculateTopOffset 的区别：此函数先通过 offsetByHour 修正日界，
 * 再取 startOf("day")，确保 00:00~06:00 的事件被归到前一日。
 * 用于 segment 渲染时计算 segStart 在当天列内的 Y 位置。
 */
export function calculateTopOffset2(
	start: number,
	offsetByHour: number,
	dayHeight: number,
): number {
	const startOfDay = dayjs(start)
		.add(-offsetByHour, "hour")
		.startOf("day")
		.add(offsetByHour, "hour");
	const percentOfDay = percent(startOfDay.valueOf(), start);
	const result = Math.floor(percentOfDay * dayHeight);
	return result;
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
	return Math.floor(percent(start, end) * dayHeight);
}
