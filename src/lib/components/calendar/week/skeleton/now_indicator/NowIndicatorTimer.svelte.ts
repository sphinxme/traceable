/**
 * 当前时间指示线定时器
 *
 * 管理当前时间指示线的定时更新和百分比位置计算。
 *
 * 每 10 秒更新一次位置（setTimeout + requestAnimationFrame），
 * nowPercentage 基于 offsetByHour 日界计算（06:00 = 0%, 次日 06:00 = 100%）。
 */
import dayjs from "dayjs";

import { MS_PER_DAY } from "../../segment_layout/config";

export class NowIndicatorTimer {
	/** 当前时间指示线的百分比位置（0~100，基于 offsetByHour 日界） */
	nowPercentage = $state(0);

	private timerId: ReturnType<typeof setTimeout> | undefined;
	private rafId = 0;

	constructor(private offsetByHour: number) { }

	/** 启动定时更新 */
	start() {
		const animate = () => {
			this.update();
			this.timerId = setTimeout(() => {
				this.rafId = requestAnimationFrame(animate);
			}, 10000);
		};
		animate();
	}

	/** 停止更新，清除 setTimeout 和 requestAnimationFrame */
	stop() {
		cancelAnimationFrame(this.rafId);
		clearTimeout(this.timerId);
	}

	/** 计算当前时间在"日"内的百分比位置（06:00 = 0%, 次日 06:00 = 100%） */
	private update() {
		const now = dayjs();
		const startOfDay = now.startOf("day").add(this.offsetByHour, "hour");
		this.nowPercentage = (now.diff(startOfDay) / MS_PER_DAY) * 100;
	}
}
