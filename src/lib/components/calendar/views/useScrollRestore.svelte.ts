import { getInteractionContext } from "$lib/interaction/context.svelte";

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
	const { scroll } = getInteractionContext();

	if (scroll.weekPanel[key]) {
		ref.scrollTo({
			top: scroll.weekPanel[key].scrollTop,
			left: scroll.weekPanel[key].scrollLeft,
			behavior: "instant",
		});
	}

	const update = () => {
		scroll.weekPanel[key] = {
			scrollTop: ref.scrollTop,
			scrollLeft: ref.scrollLeft,
		};
	};

	ref.addEventListener("scroll", update);

	return () => {
		ref.removeEventListener("scroll", update);
	};
}
