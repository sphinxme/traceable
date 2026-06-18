import { SvelteMap } from 'svelte/reactivity';

export interface UploadTask {
	progress: number;
	status: 'uploading' | 'error';
}

// 全局存储所有上传中图片的状态
export const uploadTasks = new SvelteMap<string, UploadTask>();
