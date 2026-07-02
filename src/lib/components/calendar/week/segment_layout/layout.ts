/**
 * 周视图布局引擎
 *
 * 职责：将一组 Event 转换为带定位信息的 PositionedSegment[]，
 * 供 EventSegment.svelte 直接渲染。
 *
 * 处理流程：
 *   Event[] → segmentEvent (按日切分) → EventSegment[]
 *          → allocateLanes (重叠分列)  → PositionedSegment[]
 *          → 排序输出
 *
 * 核心概念：
 * - "日"的边界由 offsetByHour 定义（默认 06:00），而非自然日 00:00。
 *   例如 offsetByHour=6 时，"一天"是 06:00~次日06:00。
 * - 跨天事件会被切分为多个 segment，每个 segment 只属于一个日列。
 * - 同一日列内时间重叠的 segments 会组成"簇"，簇内按 lane 并排显示。
 *
 * @see Week.svelte 中的 positionedSegments $derived
 * @see EventSegment.svelte 中的 laneWidth / laneLeft
 */
import { type Dayjs } from "dayjs";
import type { Event } from "$lib/states/meta/event.svelte";
import { getDayStart } from "./geometry";

/**
 * 事件的一个日列片段。
 * 一个跨天 Event 会被切分为多个 EventSegment，每个只属于一个 dayIndex。
 *
 * @property dayIndex  - 该 segment 所属的日列索引（相对于 displayStartDay，0-based）
 * @property segStart  - segment 裁剪到当天边界后的起始时间戳
 * @property segEnd    - segment 裁剪到当天边界后的结束时间戳
 * @property isFirst   - 是否是原始 Event 的第一个 segment（用于交互判断：只有 first 可从顶部 resize）
 * @property isLast    - 是否是原始 Event 的最后一个 segment（用于交互判断：只有 last 可从底部 resize）
 */
export interface EventSegment {
	eventId: string;
	event: Event;
	dayIndex: number;
	segStart: number;
	segEnd: number;
	isFirst: boolean;
	isLast: boolean;
}

/**
 * 带重叠分列信息的 segment。
 *
 * @property laneIndex - 在重叠簇中的列索引（0-based，从左到右）
 * @property laneCount - 该重叠簇的总列数（同一簇内所有 segment 共享）
 *
 * 渲染时：width = dayWidth / laneCount, left = laneIndex * width
 */
export interface PositionedSegment extends EventSegment {
	laneIndex: number;
	laneCount: number;
}

/**
 * 将单个 Event 按 offsetByHour 日界切分为多个日列 segment。
 *
 * 切分逻辑：从 event.start 开始，每次推进到下一个日界，
 * 直到覆盖 event.end。超出显示范围 [displayStartDay, displayEndDay]
 * 的 segment 会被裁剪或丢弃。
 *
 * 例如 offsetByHour=6，event = 04:00~10:00：
 *   Segment 1: 04:00~06:00 (isFirst=true,  isLast=false) — 前一日尾部
 *   Segment 2: 06:00~10:00 (isFirst=false, isLast=true)  — 当日头部
 */
function segmentEvent(
	event: Event,
	displayStartDay: Dayjs,
	displayEndDay: Dayjs,
	offsetByHour: number,
): EventSegment[] {
	const segments: EventSegment[] = [];
	const displayStartMs = displayStartDay.valueOf();
	const displayEndMs = displayEndDay.valueOf();
	const eventStart = event.start;
	const eventEnd = event.end;

	if (eventEnd <= eventStart) {
		return segments;
	}

	const rawSegments: {
		segStart: number;
		segEnd: number;
		dayIndex: number;
		isFirst: boolean;
		isLast: boolean;
	}[] = [];

	let isFirst = true;
	let current = eventStart;

	while (current < eventEnd) {
		const dayStart = getDayStart(current, offsetByHour);
		const nextDayStart = dayStart.add(1, "day");
		const segEnd = Math.min(eventEnd, nextDayStart.valueOf());

		rawSegments.push({
			segStart: current,
			segEnd,
			dayIndex: dayStart.diff(displayStartDay, "day"),
			isFirst,
			isLast: segEnd >= eventEnd,
		});

		isFirst = false;
		current = segEnd;
	}

	for (const seg of rawSegments) {
		if (seg.segEnd > displayStartMs && seg.segStart < displayEndMs) {
			segments.push({
				eventId: event.id,
				event,
				dayIndex: seg.dayIndex,
				segStart: Math.max(seg.segStart, displayStartMs),
				segEnd: Math.min(seg.segEnd, displayEndMs),
				isFirst: seg.isFirst,
				isLast: seg.isLast,
			});
		}
	}

	return segments;
}

/**
 * 重叠分列算法：为同一天列内的 segments 分配 lane（水平列）。
 *
 * 分两步：
 *
 * 1. 簇检测（Cluster Detection）
 *    按 segStart 升序排序后线性扫描，维护 clusterMaxEnd。
 *    若下一段的 segStart >= clusterMaxEnd，则当前簇闭合，开启新簇。
 *    簇内所有段通过重叠关系传递性连通（A 重叠 B，B 重叠 C ⇒ 同簇）。
 *
 * 2. 贪心 lane 分配（Greedy Lane Assignment）
 *    对簇内每一段，从 lane 0 开始找第一个空闲 lane（lanes[i] <= seg.segStart）。
 *    找到则复用并更新 lanes[i] = seg.segEnd；找不到则开新 lane。
 *    簇内所有段共享同一个 laneCount（= lanes.length）。
 *
 * 示例（同一天 4 个段）：
 *   A: 08:00-12:00  B: 09:00-11:00  C: 10:00-14:00  D: 13:00-15:00
 *
 *   簇检测：A-B-C-D 全部连通（D 的 13:00 < C 的 14:00），laneCount=3
 *   lane 分配：
 *     A → lane 0 (新开)     B → lane 1 (新开)
 *     C → lane 2 (新开)     D → lane 0 (A 已结束，复用)
 *
 * 设计决策：
 * - 排序时同 start 的段按 end 降序（长事件优先），保证长事件占据靠左 lane。
 * - 不做"最大化压缩"（即不考虑 A 结束后 D 能否挤进 A 的 lane 之外的优化），
 *   贪心已足够好且复杂度为 O(n * lanes)，n 为当天段数。
 */
function allocateLanes(segments: EventSegment[]): PositionedSegment[] {
	const sorted = [...segments].sort((a, b) => {
		if (a.segStart !== b.segStart) {
			return a.segStart - b.segStart;
		}
		return b.segEnd - a.segEnd;
	});

	const clusters: EventSegment[][] = [];
	let currentCluster: EventSegment[] = [];
	let clusterMaxEnd = -Infinity;

	for (const seg of sorted) {
		if (currentCluster.length === 0) {
			currentCluster.push(seg);
			clusterMaxEnd = seg.segEnd;
		} else if (seg.segStart >= clusterMaxEnd) {
			clusters.push(currentCluster);
			currentCluster = [seg];
			clusterMaxEnd = seg.segEnd;
		} else {
			currentCluster.push(seg);
			clusterMaxEnd = Math.max(clusterMaxEnd, seg.segEnd);
		}
	}

	if (currentCluster.length > 0) {
		clusters.push(currentCluster);
	}

	const positioned: PositionedSegment[] = [];

	for (const cluster of clusters) {
		const lanes: number[] = [];
		const clusterResults: { seg: EventSegment; laneIndex: number }[] = [];

		for (const seg of cluster) {
			let laneIndex = -1;
			for (let i = 0; i < lanes.length; i++) {
				if (lanes[i] <= seg.segStart) {
					laneIndex = i;
					break;
				}
			}

			if (laneIndex === -1) {
				laneIndex = lanes.length;
				lanes.push(seg.segEnd);
			} else {
				lanes[laneIndex] = seg.segEnd;
			}

			clusterResults.push({ seg, laneIndex });
		}

		const laneCount = lanes.length;
		for (const { seg, laneIndex } of clusterResults) {
			positioned.push({
				...seg,
				laneIndex,
				laneCount,
			});
		}
	}

	return positioned;
}

/**
 * 布局入口函数。
 *
 * 将 events 按 offsetByHour 日界切分为 per-day segments，
 * 再按日列分组做重叠分列，最后按 dayIndex + segStart 排序输出。
 *
 * @param events         - 范围内的所有事件（应已由 queryEventsByRange 过滤）
 * @param displayStartDay - 显示范围的起始日（已含 offsetByHour 偏移）
 * @param displayEndDay   - 显示范围的结束日（已含 offsetByHour 偏移）
 * @param offsetByHour   - 日界偏移小时数（默认 6，即 06:00 为日界）
 * @returns 排序后的 PositionedSegment[]，供 Week.svelte {#each} 渲染
 */
export function layoutEvents(
	events: Event[],
	displayStartDay: Dayjs,
	displayEndDay: Dayjs,
	offsetByHour: number,
): PositionedSegment[] {
	const allSegments: EventSegment[] = [];

	for (const event of events) {
		allSegments.push(
			...segmentEvent(event, displayStartDay, displayEndDay, offsetByHour),
		);
	}

	const byDay = new Map<number, EventSegment[]>();

	for (const seg of allSegments) {
		const daySegs = byDay.get(seg.dayIndex);
		if (daySegs) {
			daySegs.push(seg);
		} else {
			byDay.set(seg.dayIndex, [seg]);
		}
	}

	const positioned: PositionedSegment[] = [];

	for (const [, daySegs] of byDay) {
		positioned.push(...allocateLanes(daySegs));
	}

	positioned.sort((a, b) => {
		if (a.dayIndex !== b.dayIndex) {
			return a.dayIndex - b.dayIndex;
		}
		return a.segStart - b.segStart;
	});

	return positioned;
}

/**
 * 根据 segment 的 lane 信息计算渲染时的像素宽度和左偏移。
 *
 * EventSegment.svelte 中也可直接计算（laneWidth = dayWidth / laneCount），
 * 此函数仅作为集中入口，方便未来调整间距/padding 等样式。
 */
export function getLaneGeometry(
	segment: PositionedSegment,
	dayWidth: number,
): { width: number; left: number } {
	const width = Math.floor(dayWidth / segment.laneCount);
	const left = segment.laneIndex * width;
	return { width, left };
}
