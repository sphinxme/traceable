/**
 * 滚动位置记忆服务
 *
 * 恢复上次滚动位置，并监听 scroll 事件持续持久化。
 * 存储于 WeekPanelController.scrollMemory（会话级 Map，键 "__panel__"）。
 *
 * 首次加载（无滚动记忆）时水平滚动到今天的日列并居中。
 */
import { SIDE_WIDTH, SIZE } from "./segment_layout/config";
import type { ScrollState } from "$lib/protocol";
import type { WeekSkeletonController } from "./skeleton/WeekSkeletonController.svelte";

const SCROLL_KEY = "__panel__";

export class ScrollRestoreService {
  private cleanup: (() => void) | null = null;

  constructor(
    private skeleton: WeekSkeletonController,
    private readonly scrollMemory: Map<string, ScrollState>,
  ) {}

  /**
   * 恢复上次滚动位置，并监听 scroll 事件持续持久化。
   * 应在组件就绪后（scrollAreaRef 可用时）调用。
   */
  setup(ref: HTMLElement | null) {
    if (!ref) return;

    const saved = this.scrollMemory.get(SCROLL_KEY);
    if (saved) {
      ref.scrollTo({
        top: saved.scrollTop,
        left: saved.scrollLeft,
        behavior: "instant",
      });
    } else {
      this.scrollToToday(ref);
    }

    const update = () => {
      this.scrollMemory.set(SCROLL_KEY, {
        scrollTop: ref.scrollTop,
        scrollLeft: ref.scrollLeft,
      });
    };

    ref.addEventListener("scroll", update);
    this.cleanup = () => ref.removeEventListener("scroll", update);
  }

  /** 停止监听，移除 scroll 事件监听器 */
  destroy() {
    this.cleanup?.();
  }

  /**
   * 首次加载（无滚动记忆）时水平滚动到今天的日列并居中。
   * 使用网格几何常量（SIDE_WIDTH / SIZE）计算像素位置，不依赖 containerWidth。
   */
  private scrollToToday(ref: HTMLElement) {
    requestAnimationFrame(() => {
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const sideWidthPx = SIDE_WIDTH * rem;
      const dayWidthPx = SIZE * rem;
      const todayIndex = this.skeleton.dayNum;
      const todayLeft = sideWidthPx + todayIndex * dayWidthPx;
      const scrollTarget = todayLeft - (ref.clientWidth - dayWidthPx) / 2;
      ref.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: "smooth",
      });
    });
  }
}
