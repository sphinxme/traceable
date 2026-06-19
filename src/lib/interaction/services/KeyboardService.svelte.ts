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
