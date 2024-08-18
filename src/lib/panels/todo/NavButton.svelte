<script lang="ts">
	let classes: string;
	export { classes as class };
	export let herf: string;
</script>

<button
	type="button"
	class={classes}
	on:click={() => {
		console.log(herf);
	}}
>
	<slot></slot>
</button>
