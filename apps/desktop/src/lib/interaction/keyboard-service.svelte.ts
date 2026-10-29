/**
 * KeyboardService（保留件）— 追踪 Meta 键（⌘）的按下状态。
 *
 * 通过 window 级 keydown / keyup 监听维护 `metaKey` 响应式状态，
 * 供 DnDAdapter 读取以实现 Cmd+拖放 = link 等组合交互。
 *
 * 构造期 `$effect` 注册监听，cleanup 自动移除——须在组件初始化上下文中构造。
 */
export class KeyboardService {
  public metaKey: boolean = $state(false);

  private onDown = (e: KeyboardEvent) => {
    if (e.key === "Meta") {
      this.metaKey = true;
    }
  };

  private onUp = (e: KeyboardEvent) => {
    if (e.key === "Meta") {
      this.metaKey = false;
    }
  };

  public constructor() {
    $effect(() => {
      window.addEventListener("keydown", this.onDown);
      window.addEventListener("keyup", this.onUp);
      return () => {
        window.removeEventListener("keydown", this.onDown);
        window.removeEventListener("keyup", this.onUp);
      };
    });
  }

  public destroy() {}
}
