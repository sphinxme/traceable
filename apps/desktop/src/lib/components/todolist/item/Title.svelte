<script lang="ts">
  /**
   * Title — 根条目标题组件（根条目实例的标题渲染器）。
   *
   * 键位表见 keyboard-adapter §6：Enter / Shift+Enter / ArrowDown；
   * ArrowUp 不注册（root 无上浮目标）。`title` part 与焦点接线在 effect 内收口。
   */
  import { quill } from "$lib/components/quill/quill";
  import Quill, { type QuillOptions } from "quill";
  import type { ViewHandle } from "$lib/view/view-handle.svelte";
  import { getAppServices } from "$lib/app/context.svelte";

  interface Props {
    handle: ViewHandle;
    highlightTitle?: boolean;
  }

  let { handle, highlightTitle }: Props = $props();

  const keyboardAdapter = getAppServices().keyboardAdapter;

  const configs: QuillOptions = {
    modules: {
      toolbar: false,
    },
    theme: "bubble",
    placeholder: "",
  };

  let titleEl: HTMLHeadingElement;

  const init = (editor: Quill) => {
    editor.keyboard.bindings["Tab"].unshift({
      key: "Tab",
      shiftKey: false,
      handler() {
        return false;
      },
    });
    editor.keyboard.bindings["Tab"].unshift({
      key: "Tab",
      shiftKey: true,
      handler() {
        return false;
      },
    });
    editor.keyboard.addBinding({
      key: "ArrowDown",
      handler(_range, curContext) {
        return !keyboardAdapter.onArrowDown(handle, curContext.offset);
      },
    });
    editor.keyboard.bindings["Enter"].unshift({
      key: "Enter",
      shiftKey: false,
      handler(range, curContext) {
        return !keyboardAdapter.onEnter(handle, range, curContext, this.quill);
      },
    });
    editor.keyboard.bindings["Enter"].unshift({
      key: "Enter",
      shiftKey: true,
      handler() {
        return !keyboardAdapter.onShiftEnter(handle);
      },
    });

    handle.focusEditor = (cursor) => {
      editor.setSelection(cursor, 0);
      return true;
    };
  };

  $effect(() => {
    handle.bindPart("title", titleEl);
    return () => {
      handle.focusEditor = () => false;
      handle.unbindPart("title");
    };
  });
</script>

<!-- svelte-ignore a11y_missing_content -->
<h1
  bind:this={titleEl}
  class="traceable-quill-title group relative scroll-m-20 py-4 text-3xl font-bold tracking-tight transition-colors first:mt-0"
>
  {#if highlightTitle}
    <div
      class=" absolute h-full rounded-full bg-zinc-300 transition duration-500 group-hover:bg-zinc-500"
      style:width="2px"
    ></div>
  {/if}
  <div use:quill={{ text: handle.task.text, configs, init }}></div>
</h1>

<style>
  :global(.traceable-quill-title .ql-container) {
    font-size: xx-large;
    padding-top: 0px;
    padding-bottom: 0px;
  }
  :global(.traceable-quill-title .ql-editor) {
    padding-top: 0px;
    padding-bottom: 0px;
    width: 100%;
    flex-grow: 1;
  }
</style>
