import { weekPanelScrollStates } from "./state.svelte";

export type RestoreKey = string;

export interface ScrollState {
	scrollTop: number;
	scrollLeft: number;
}

export interface UseScrollRestoreOptions {
	key?: RestoreKey;
}

export function useScrollRestore(
	ref: HTMLElement,
	options: UseScrollRestoreOptions = {},
) {
	const key = options.key ?? "weekPanel";

	if (weekPanelScrollStates[key]) {
		ref.scrollTo({
			top: weekPanelScrollStates[key].scrollTop,
			left: weekPanelScrollStates[key].scrollLeft,
			behavior: "instant",
		});
	}

	const update = () => {
		console.log("updated");
		weekPanelScrollStates[key] = {
			scrollTop: ref.scrollTop,
			scrollLeft: ref.scrollLeft,
		};
	};
	console.log({ weekPanelScrollStates });

	ref.addEventListener("scroll", update);

	return () => {
		ref.removeEventListener("scroll", update);
	};
}
