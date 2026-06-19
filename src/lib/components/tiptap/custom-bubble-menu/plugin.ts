	import { Extension, type Editor } from "@tiptap/core";
	import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
	import type { EditorView } from "@tiptap/pm/view";
	import type { FloatingOptions } from "./positioning";

	export type BubbleMenuUpdateHandler = (
		view: EditorView,
		oldState: EditorState | undefined,
	) => void;

	export interface BubbleMenuHandlers {
		onUpdate: BubbleMenuUpdateHandler | null;
	}

	export function createHandlers(): BubbleMenuHandlers {
		return { onUpdate: null };
	}

	interface PluginViewOptions {
		editor: Editor;
		view: EditorView;
		pluginKey: PluginKey;
		handlers: BubbleMenuHandlers | null;
	}

	class BubbleMenuPluginView {
		editor: Editor;
		view: EditorView;
		pluginKey: PluginKey;
		handlers: BubbleMenuHandlers | null;

		constructor({ editor, view, pluginKey, handlers }: PluginViewOptions) {
			this.editor = editor;
			this.view = view;
			this.pluginKey = pluginKey;
			this.handlers = handlers;
		}

		update(view: EditorView, oldState?: EditorState) {
			this.handlers?.onUpdate?.(view, oldState);
		}

		destroy() {
			this.handlers = null;
		}
	}

	export interface CustomBubbleMenuOptions {
		pluginKey?: string | PluginKey;
		handlers?: BubbleMenuHandlers | null;
		options?: FloatingOptions;
	}

	export const CustomBubbleMenu = Extension.create<CustomBubbleMenuOptions>({
		name: "customBubbleMenu",

		addOptions() {
			return {
				pluginKey: "bubbleMenu",
				handlers: null,
				options: undefined,
			};
		},

		addProseMirrorPlugins() {
			const keyOpt = this.options.pluginKey ?? "bubbleMenu";
			const pluginKey =
				typeof keyOpt === "string" ? new PluginKey(keyOpt) : keyOpt;

			return [
				new Plugin({
					key: pluginKey,
					view: (view) =>
						new BubbleMenuPluginView({
							editor: this.editor,
							view,
							pluginKey,
							handlers: this.options.handlers ?? null,
						}),
				}),
			];
		},
	});
