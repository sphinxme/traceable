<script lang="ts">
	export let path: string;
	export let href: string;

	// import { page } from '$app/stores';

	// 使用导入的 page store 来获取当前路径
	// import { derived } from 'svelte/store';
	// const isActive = derived(page, ($page) => $page.url.pathname === path);
</script>

<a
	{href}
	class="m-1 rounded-lg p-2 px-4 text-center text-lg transition-colors duration-300 hover:bg-slate-200"
	class:bg-slate-200={false}
>
	<slot />
</a>
