import type { PathItem } from "$lib/states/stores.svelte";

let paths: PathItem[] = [];
export function storePaths(newPaths: PathItem[]) {
    paths = newPaths;
}

export function getPrePaths() {
    return paths;
}