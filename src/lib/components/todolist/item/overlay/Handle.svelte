<script lang="ts">
	export let taskId: string;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-interactive-supports-focus -->
<div
	role="button"
	on:click
	data-task-id={taskId}
	class="group relative flex items-center justify-center"
>
	<span
		class=" absolute z-0 h-5 w-5 rounded-full bg-slate-200 opacity-0 transition-opacity duration-100 ease-in group-hover:opacity-100"
	/>
	<span class={` z-10 h-2 w-2 rounded-full bg-slate-500`} />
</div>
