import type { Observable } from "rxjs";
import type { TaskProxy } from "./rxdb";

export const highlightFEventIds: Record<string, boolean> = $state({});

export interface PathItem {
    id: string;
    proxy: Observable<TaskProxy>;
}

export interface Paths {
    push: (subpaths: PathItem[]) => void,
}


