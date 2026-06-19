export class FocusService {
	public highlight: Record<string, boolean> = $state({});
	public focusing: Record<string, boolean> = $state({});
}
