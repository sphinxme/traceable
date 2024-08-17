import { Dayjs } from "dayjs";

/**
 * 获取占一天的百分比
 * @param start 
 * @param end 
 * @returns 
 */
export function percent(start: Dayjs, end: Dayjs) {
    const a = end.diff(start) / (24 * 60 * 60 * 1000);
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

export function split(start: Dayjs, end: Dayjs) {
    const result: { start: Dayjs; end: Dayjs }[] = [];

    while (true) {
        const endDayOfStart = start.endOf('day');
        if (endDayOfStart.isAfter(end)) {
            result.push({ start, end });
            return result;
        }

        result.push({ start, end: endDayOfStart });
        start = endDayOfStart.add(1, 'minute').startOf('day');
    }
}
