/**
 * 将毫秒时长格式化为中文可读字符串（如 "1.5小时"、"30分钟"）
 */
export function formatDuration(duration: number): string {
	const hours = Math.floor(duration / (60 * 60 * 1000));
	const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));

	if (hours === 0) {
		return `${minutes}分钟`;
	}
	if (minutes === 0) {
		return `${hours}小时`;
	}
	if (minutes === 30) {
		return `${hours}.5小时`;
	}

	return `${hours}小时${minutes}分钟`;
}
