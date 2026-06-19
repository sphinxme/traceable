import { getContext, hasContext, setContext } from "svelte";
import { CursorRestorationService } from "./services/CursorRestorationService.svelte";
import { DragService } from "./services/DragService.svelte";
import { FocusService } from "./services/FocusService.svelte";
import { KeyboardService } from "./services/KeyboardService.svelte";
import { ScrollMemoryService } from "./services/ScrollMemoryService.svelte";

export class InteractionContext {
	public readonly drag = new DragService();
	public readonly focus = new FocusService();
	public readonly cursor = new CursorRestorationService();
	public readonly scroll = new ScrollMemoryService();
	public readonly keyboard = new KeyboardService();

	public onTodoReady() {}

	public destroy() {
		this.drag.destroy();
		this.keyboard.destroy();
	}
}

const KEY = "interactionContext";

export function setInteractionContext(ctx: InteractionContext) {
	setContext<InteractionContext>(KEY, ctx);
}

export function getInteractionContext(): InteractionContext {
	if (!hasContext(KEY)) {
		throw new Error(
			"InteractionContext not set; call setInteractionContext at the app root",
		);
	}
	return getContext<InteractionContext>(KEY);
}
