/**
 * 键盘服务 — 追踪 Meta 键（⌘）的按下状态。
 *
 * 通过 `window` 级 keydown / keyup 监听维护 `metaKey` 响应式状态，
 * 供其他组件读取以实现 Cmd+点击 等组合交互。
 *
 * 在 `InteractionContext` 构造时自动注册监听，`destroy` 时移除。
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
