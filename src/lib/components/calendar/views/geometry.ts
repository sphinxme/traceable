import dayjs, { Dayjs } from "dayjs";

export function percent(start: number, end: number) {
	const a = (end - start) / (24 * 60 * 60 * 1000);
	if (a < 1 && a > 0) {
		return a;
	}
	return 0;
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

export function calculateEventHeight(
	start: number,
	end: number,
	dayHeight: number,
): number {
	return Math.floor(percent(start, end) * dayHeight);
}
