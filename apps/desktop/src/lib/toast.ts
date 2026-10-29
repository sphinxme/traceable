import { toast as sonnerToast } from "svelte-sonner";

/** 统一 UI 提示入口（MVP：文案 = 失败 reason 直显；文案打磨不阻塞流程）。 */
export function toast(message: string): void {
  sonnerToast.error(message);
}
