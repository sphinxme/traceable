	import {
		computePosition,
		flip,
		offset,
		shift,
		type Placement,
		type Strategy,
		type OffsetOptions,
		type FlipOptions,
		type ShiftOptions,
		type Middleware,
	} from "@floating-ui/dom";
	import { isTextSelection, posToDOMRect } from "@tiptap/core";
	import type { Editor } from "@tiptap/core";
	import { NodeSelection } from "@tiptap/pm/state";
	import type { EditorState } from "@tiptap/pm/state";
	import { CellSelection } from "@tiptap/pm/tables";
	import type { EditorView } from "@tiptap/pm/view";

	export interface FloatingOptions {
		placement?: Placement;
		strategy?: Strategy;
		offset?: number | boolean | OffsetOptions;
		flip?: boolean | FlipOptions;
		shift?: boolean | ShiftOptions;
	}

	export interface VirtualElement {
		getBoundingClientRect: () => DOMRect;
		getClientRects: () => DOMRect[];
	}

	export function combineDOMRects(a: DOMRect, b: DOMRect): DOMRect {
		const left = Math.min(a.left, b.left);
		const right = Math.max(a.right, b.right);
		const top = Math.min(a.top, b.top);
		const bottom = Math.max(a.bottom, b.bottom);
		return new DOMRect(left, top, right - left, bottom - top);
	}

	export function getFromTo(state: EditorState): { from: number; to: number } {
		const { ranges } = state.selection;
		const from = Math.min(...ranges.map((r) => r.$from.pos));
		const to = Math.max(...ranges.map((r) => r.$to.pos));
		return { from, to };
	}

	export interface ShouldShowArgs {
		editor: Editor;
		view: EditorView;
		state: EditorState;
		container: HTMLElement | null;
	}

	export function getShouldShow({
		editor,
		view,
		state,
		container,
	}: ShouldShowArgs): boolean {
		const { doc, selection } = state;
		const { empty } = selection;
		const { from, to } = getFromTo(state);
		const isEmptyTextBlock =
			!doc.textBetween(from, to).length && isTextSelection(selection);
		const isChildOfMenu = container
			? container.contains(document.activeElement)
			: false;
		const hasEditorFocus = view.hasFocus() || isChildOfMenu;
		if (!hasEditorFocus || empty || isEmptyTextBlock || !editor.isEditable) {
			return false;
		}
		return true;
	}

	export function getVirtualElement({
		editor,
		view,
	}: {
		editor: Editor;
		view: EditorView;
	}): VirtualElement | null {
		const { selection } = editor.state;
		if (!view.dom.parentNode) return null;

		const { from, to } = getFromTo(editor.state);
		const domRect = posToDOMRect(view, from, to);
		let virtual: VirtualElement = {
			getBoundingClientRect: () => domRect,
			getClientRects: () => [domRect],
		};

		if (selection instanceof NodeSelection) {
			let node = view.nodeDOM(selection.from) as HTMLElement | null;
			const wrapper = node?.dataset?.nodeViewWrapper
				? node
				: (node?.querySelector("[data-node-view-wrapper]") as HTMLElement | null);
			if (wrapper) node = wrapper;
			if (node) {
				const rect = node.getBoundingClientRect();
				virtual = {
					getBoundingClientRect: () => rect,
					getClientRects: () => [rect],
				};
			}
		}

		if (selection instanceof CellSelection) {
			const { $anchorCell, $headCell } = selection;
			const fromPos = $anchorCell ? $anchorCell.pos : $headCell.pos;
			const toPos = $headCell ? $headCell.pos : $anchorCell.pos;
			const fromDOM = view.nodeDOM(fromPos) as HTMLElement | null;
			const toDOM = view.nodeDOM(toPos) as HTMLElement | null;
			if (fromDOM && toDOM) {
				const rect =
					fromDOM === toDOM
						? fromDOM.getBoundingClientRect()
						: combineDOMRects(
								fromDOM.getBoundingClientRect(),
								toDOM.getBoundingClientRect(),
							);
				virtual = {
					getBoundingClientRect: () => rect,
					getClientRects: () => [rect],
				};
			}
		}

		return virtual;
	}

	export function getMiddlewares(options: FloatingOptions): Middleware[] {
		const middlewares: Middleware[] = [];
		const normalize = <T>(v: T | boolean | undefined): T | undefined =>
			v === true ? undefined : (v as T | undefined);
		if (options.flip) middlewares.push(flip(normalize(options.flip)));
		if (options.shift) middlewares.push(shift(normalize(options.shift)));
		if (options.offset)
			middlewares.push(offset(normalize(options.offset) as OffsetOptions));
		return middlewares;
	}

	export interface PositionResult {
		x: number;
		y: number;
		strategy: Strategy;
		referenceHidden: boolean;
		escaped: boolean;
	}

	export async function computeBubblePosition(
		virtualElement: VirtualElement,
		element: HTMLElement,
		options: FloatingOptions,
	): Promise<PositionResult> {
		const { x, y, strategy, middlewareData } = await computePosition(
			virtualElement,
			element,
			{
				placement: options.placement,
				strategy: options.strategy ?? "absolute",
				middleware: getMiddlewares(options),
			},
		);
		return {
			x,
			y,
			strategy,
			referenceHidden: middlewareData.hide?.referenceHidden ?? false,
			escaped: middlewareData.hide?.escaped ?? false,
		};
	}
