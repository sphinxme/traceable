import { writable } from "svelte/store";

export const dragging = writable(false);

const dropDatas = new Map<string, any>();
export function setDnDData<T>(channel: string, data: T) {
    dropDatas.set(channel, data);
}

export function getDnDData<T>(channel: string): T {
    return dropDatas.get(channel);
}