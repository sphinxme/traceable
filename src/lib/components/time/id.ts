import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn');

export function weekDocIdFromTime(date?: dayjs.ConfigType) {
    const day = dayjs(date).startOf('week').format('YYYY-MM-DD');
    return `organize-weekly-${day}`;
}

export function currentWeekDocId() {
    return weekDocIdFromTime(dayjs());
}

export function nextWeekId(id: string) {
    const date = dateFromWeekDocId(id)?.add(1, 'week');
    return weekDocIdFromTime(date);
}

export function preWeekId(id: string) {
    const date = dateFromWeekDocId(id)?.subtract(1, 'week');
    return weekDocIdFromTime(date);
}

export function dateFromWeekDocId(id: string): Dayjs | null {
    const regex = /\d{4}-\d{2}-\d{2}$/;
    const match = id.match(regex);
    if (!match) {
        return null;
    }
    return dayjs(match[0]);
}