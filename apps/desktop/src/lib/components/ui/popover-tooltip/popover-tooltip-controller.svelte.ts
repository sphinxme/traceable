/**
 * PopoverTooltip 控制器。
 *
 * 合并状态管理与 trigger action，基于 Svelte 5 runes ($state)。
 * 使用原生 Popover API (popover="manual") 实现 top-layer 渲染，
 * 配合 @floating-ui/dom 做定位。
 *
 * 使用方式：
 *   const tooltip = new PopoverTooltipController({ delayDuration: 0 });
 *   // trigger: <div use:tooltip.trigger>...</div>
 *   // content: <PopoverTooltipContent tooltip={tooltip} ... />
 */
export class PopoverTooltipController {
	/** 是否打开 */
	open = $state(false);
	/** 触发元素引用（供 floating-ui 定位） */
	triggerEl = $state<HTMLElement | null>(null);
	/** 显示延迟（ms） */
	delayDuration = $state(0);

	private showTimer: ReturnType<typeof setTimeout> | null = null;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly hideDelay = 100;

	constructor(options?: { delayDuration?: number }) {
		if (options?.delayDuration !== undefined) {
			this.delayDuration = options.delayDuration;
		}
	}

	/**
	 * Svelte Action：将 hover 行为绑定到触发元素。
	 * 箭头函数类字段，确保 this 始终指向控制器实例。
	 *
	 * 不产生额外 DOM 节点，直接在消费者已有的元素上挂载 mouseenter/mouseleave。
	 */
	trigger = (node: HTMLElement) => {
		this.triggerEl = node;

		const onEnter = () => this.show();
		const onLeave = () => this.hide();

		node.addEventListener("mouseenter", onEnter);
		node.addEventListener("mouseleave", onLeave);

		return {
			destroy: () => {
				node.removeEventListener("mouseenter", onEnter);
				node.removeEventListener("mouseleave", onLeave);
				this.triggerEl = null;
			},
		};
	};

	/** 清除显示定时器 */
	clearShowTimer() {
		if (this.showTimer) {
			clearTimeout(this.showTimer);
			this.showTimer = null;
		}
	}

	/** 清除隐藏定时器 */
	clearHideTimer() {
		if (this.hideTimer) {
			clearTimeout(this.hideTimer);
			this.hideTimer = null;
		}
	}

	/**
	 * 调度显示（延迟 delayDuration 后）。
	 * 同时关闭其他已打开的 tooltip，确保全局只有一个。
	 */
	show() {
		this.clearHideTimer();
		if (this.open) return;
		this.showTimer = setTimeout(() => {
			if (currentOpenTooltip && currentOpenTooltip !== this) {
				currentOpenTooltip.open = false;
			}
			this.open = true;
			currentOpenTooltip = this;
		}, this.delayDuration);
	}

	/**
	 * 调度隐藏（延迟 hideDelay 后，留出鼠标从 trigger 移到 content 的时间）。
	 */
	hide() {
		this.clearShowTimer();
		if (!this.open) return;
		this.hideTimer = setTimeout(() => {
			this.open = false;
			if (currentOpenTooltip === this) {
				currentOpenTooltip = null;
			}
		}, this.hideDelay);
	}

	/** 清理：清除定时器并关闭 */
	destroy() {
		this.clearShowTimer();
		this.clearHideTimer();
		this.open = false;
		if (currentOpenTooltip === this) {
			currentOpenTooltip = null;
		}
	}
}

/** 模块级单例：当前打开的 tooltip，确保同一时间只有一个 */
let currentOpenTooltip: PopoverTooltipController | null = null;
