<script lang="ts">
	/**
	 * CollapseButton — 折叠/展开按钮组件。
	 *
	 * 在 TodoItem 的叠加层中显示，控制 `StateStore.$folded` 状态。
	 *
	 * **显示逻辑**：
	 * - 折叠时 → 始终可见，旋转 -90°（箭头朝右）
	 * - 展开时 → 仅在 group hover 时半透明显示
	 *
	 * 仅在有子项的 Todo 中渲染（由 `Todo.svelte` 控制）。
	 *
	 * @prop folded - 折叠状态（双向绑定）
	 * @prop onfolded - 折叠回调
	 * @prop onunfolded - 展开回调
	 */
	import { ChevronDown } from "@lucide/svelte";
	interface Props {
		folded?: boolean;
		onfolded: () => void;
		onunfolded: () => void;
	}

	let { folded = $bindable(false), onfolded, onunfolded }: Props = $props();

	const displayClass = (folded: boolean) => {
		if (folded) {
			return "opacity-100";
		}
		return "group-hover:opacity-50 opacity-0";
	};
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	onclick={() => {
		folded = !folded;
		if (folded) {
			onfolded();
		} else {
			onunfolded();
		}
	}}
	class={`${displayClass(folded)} bg-white cursor-pointer transition-all duration-300 ease-out ${folded ? "-rotate-90" : ""}`}
>
	<ChevronDown size={16} strokeWidth={3} />
</div>
