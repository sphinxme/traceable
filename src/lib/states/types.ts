import type { Writable } from "svelte/store";

export interface LastOneEmptyStatus {
    isLastOneEmpty: Writable<boolean>;
}
export const LastOneEmptyStatusKey = "LastOneEmptyStatus"