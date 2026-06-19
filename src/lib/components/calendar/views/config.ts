export const DEFAULT_DAY_NUM = 10;
export const OFFSET_BY_HOUR = 6;
export const SIDE_WIDTH = 4;
export const SIZE = 7;

export const NOT_WORK_HOUR_RANGES: ReadonlyArray<{
	start: number;
	end: number;
}> = [
	{ start: 6, end: 10 },
	{ start: 12, end: 13.5 },
	{ start: 18, end: 19.5 },
	{ start: 22, end: 30 },
];
