/**
 * 图片上传 — 通过 Tauri HTTP 走 S3 预签名 URL 上传。
 *
 * 流程：获取预签名 URL → 上传文件到 S3 → 返回图片访问 URL。
 * 作为 ProseKit defineImageUploadHandler 的 uploader 使用。
 */
import { fetch as rustFetch } from '@tauri-apps/plugin-http';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;
const API_KEY = import.meta.env.VITE_API_KEY;

// Tauri 环境用 rustFetch（绕过 CORS），浏览器 fallback 到原生 fetch
const _fetch = (rustFetch as unknown as typeof fetch | undefined) || fetch;

export interface UploadCallbacks {
	onProgress?: (percent: number) => void;
}

export async function uploadImage(file: File, callbacks?: UploadCallbacks): Promise<string> {
	// 1. 获取预签名 URL
	const response = await _fetch(`${API_ENDPOINT}/pictures/upload`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": API_KEY,
		},
		body: JSON.stringify({
			filename: file.name,
			contentType: file.type,
		}),
	});

	if (!response.ok) {
		throw new Error(`获取预签名URL失败: ${response.status}`);
	}

	const { data } = await response.json();

	// 2. 上传文件到 S3
	const uploadResponse = await _fetch(data.uploadUrl, {
		method: data.method,
		headers: data.headers,
		body: file,
	});

	if (!uploadResponse.ok) {
		throw new Error(`上传文件失败: ${uploadResponse.status}`);
	}

	// 3. 返回图片访问 URL
	return data.pictureUrl;
}
