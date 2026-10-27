<script lang="ts">
	import {
		computePosition,
		flip,
		offset,
		shift,
		autoUpdate,
		type Placement,
	} from "@floating-ui/dom";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";
	import type { PopoverTooltipController } from "./popover-tooltip-controller.svelte";

	let {
		tooltip,
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		side = "top",
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		tooltip: PopoverTooltipController;
		ref?: HTMLDivElement | null;
		sideOffset?: number;
		side?: "top" | "bottom" | "left" | "right";
	} = $props();

	let el: HTMLDivElement | null = null;

	$effect(() => {
		ref = el;
	});

	const placement = $derived<Placement>(side);

	// ── 显隐：调用原生 Popover API ──

	$effect(() => {
		const content = el;
		if (!content) return;
		if (tooltip.open) {
			content.showPopover();
			content.dataset.state = "open";
		} else {
			content.dataset.state = "closed";
			content.hidePopover();
		}
	});

	// ── 定位：@floating-ui/dom + autoUpdate ──

	$effect(() => {
		const trigger = tooltip.triggerEl;
		const content = el;
		if (!content || !trigger || !tooltip.open) return;

		const cleanup = autoUpdate(trigger, content, async () => {
			const { x, y, placement: actualPlacement } = await computePosition(
				trigger,
				content,
				{
					placement,
					strategy: "fixed",
					middleware: [offset(sideOffset), flip(), shift({ padding: 8 })],
				},
			);
			content.style.left = `${x}px`;
			content.style.top = `${y}px`;
			content.dataset.side = actualPlacement.split("-")[0];
		});

		return cleanup;
	});

	// ── 清理 ──

	$effect(() => {
		return () => tooltip.destroy();
	});
</script>

<div
	bind:this={el}
	popover="manual"
	data-side={side}
	data-state="closed"
	class={cn(
		"bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 fixed inset-auto m-0 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md",
		className,
	)}
	onmouseenter={() => tooltip.clearHideTimer()}
	onmouseleave={() => tooltip.hide()}
	{...restProps}
>
	{@render children?.()}
</div>
