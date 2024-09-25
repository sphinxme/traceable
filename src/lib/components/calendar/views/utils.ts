import { Dayjs } from "dayjs";

/**
 * 获取占一天的百分比
 * @param start
 * @param end
 * @returns
 */
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

/**
 * 将给定的时间四舍五入到最近的15分钟倍数。
 * @param {dayjs.Dayjs} time - 需要进行四舍五入的时间。
 * @returns {dayjs.Dayjs} 四舍五入后的时间。
 */
export function roundToNearest15Minutes(time: Dayjs) {
    // 获取当前分钟数
    const minutes = time.minute();

    // 计算距离最近的15分钟倍数的分钟数
    const remainder = minutes % 15;
    let roundedMinutes = minutes;

    // 如果剩余分钟数小于7.5分钟，则向下取整到最近的15分钟倍数
    // 如果剩余分钟数大于等于7.5分钟，则向上取整到最近的15分钟倍数
    if (remainder < 7.5) {
        roundedMinutes -= remainder;
    } else {
        roundedMinutes += 15 - remainder;
    }

    // 返回四舍五入后的时间
    return time.minute(roundedMinutes).second(0).millisecond(0);
}

/**
 * 当前这天是否是休息日(周末为休息日)
 */
export function isRestDay(day: Dayjs) {
    return (day.day() + 6) % 7 >= 5;
}
