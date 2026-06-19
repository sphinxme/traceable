import dayjs from "dayjs";
import { OFFSET_BY_HOUR } from "./config";

const TOTAL_MILLISECONDS = 24 * 60 * 60 * 1000;

export function useNowIndicator(offsetByHour: number = OFFSET_BY_HOUR) {
	let currentTimePercentage = $state(0);
	let animationFrameId = 0;
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	const updateTimePosition = () => {
		const now = dayjs();
		const startOfDay = now.startOf("day").add(offsetByHour, "hour");
		const currentMilliseconds = now.diff(startOfDay);
		currentTimePercentage = (currentMilliseconds / TOTAL_MILLISECONDS) * 100;
	};

	const animate = () => {
		updateTimePosition();
		timeoutId = setTimeout(() => {
			animationFrameId = requestAnimationFrame(animate);
		}, 10000);
	};

	const start = () => {
		animate();
	};

	const stop = () => {
		cancelAnimationFrame(animationFrameId);
	};

	return {
		get currentTimePercentage() {
			return currentTimePercentage;
		},
		start,
		stop,
	};
}
