import { Subject } from "rxjs";

export const highlightTaskSignal = new Subject<{ id: string, index: number }>()
