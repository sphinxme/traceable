<script lang="ts">
  /**
   * TodoItem — 条目渲染组件（标题编辑器 + 事件指示 + 笔记）。
   *
   * Quill 键位注册留在组件，handler 直传 KeyboardAdapter 布尔（K1）；
   * `title` part 与 `focusEditor` 接线在 effect 内收口（W2/G6）。
   */
  import "quill/dist/quill.core.css";
  import Quill, { type QuillOptions } from "quill";
  import * as Popover from "$lib/components/ui/popover";

  import EventIndicator from "./event/EventIndicator.svelte";
  import NoteEditor from "./note/NoteEditor.svelte";
  import Overlay from "./overlay/Overlay.svelte";
  import type { ViewHandle } from "$lib/view/view-handle.svelte";
  import { getAppServices } from "$lib/app/context.svelte";
  import { quill } from "$lib/components/quill/quill";

  interface Props {
    handle: ViewHandle;
    overlay?: import("svelte").Snippet;
    handleSlot?: import("svelte").Snippet;
    drag?: import("svelte").Snippet;
  }

  let { handle, overlay, handleSlot, drag }: Props = $props();

  const task = handle.task;
  const keyboardAdapter = getAppServices().keyboardAdapter;

  const configs: QuillOptions = {
    modules: {
      toolbar: false,
    },
    theme: "bubble",
    placeholder: "",
  };

  let editor: Quill | undefined;
  let titleEl: HTMLDivElement;
  // NoteEditor 通过 bind:this 暴露 editor 实例与 destroy 方法
  let noteEditor: { editor: { focus: () => void }; destroy: () => void };

  const init = (instance: Quill) => {
    editor = instance;

    instance.keyboard.bindings["Tab"].unshift({
      key: "Tab",
      shiftKey: false,
      handler(_range, curContext) {
        keyboardAdapter.onTab(handle, curContext.offset);
        return false;
      },
    });
    instance.keyboard.bindings["Tab"].unshift({
      key: "Tab",
      shiftKey: true,
      handler(_range, curContext) {
        keyboardAdapter.onUntab(handle, curContext.offset);
        return false;
      },
    });
    instance.keyboard.bindings["Enter"].unshift({
      key: "Enter",
      shiftKey: false,
      handler(range, curContext) {
        return !keyboardAdapter.onEnter(handle, range, curContext, this.quill);
      },
    });
    instance.keyboard.bindings["Enter"].unshift({
      key: "Enter",
      shiftKey: true,
      handler() {
        return !keyboardAdapter.onShiftEnter(handle);
      },
    });
    instance.keyboard.addBinding({
      key: "ArrowUp",
      handler(_range, curContext) {
        return !keyboardAdapter.onArrowUp(handle, curContext.offset);
      },
    });
    instance.keyboard.addBinding({
      key: "ArrowDown",
      handler(_range, curContext) {
        return !keyboardAdapter.onArrowDown(handle, curContext.offset);
      },
    });

    handle.focusEditor = (cursor) => {
      instance.setSelection(cursor, 0);
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

  let sortedEvents = $derived(
    [...task.events].sort((a, b) => a.start - b.start),
  );
  let isCompleted = $derived(task.isCompleted);
  let note = $derived(task.$note);

  // Popover 关闭时立即销毁 NoteEditor（在 Svelte teardown 移除 DOM 之前），
  // 避免 teardown 触发 ProseKit updateExtension 重入崩溃，原因详见 NoteEditor.svelte
  $effect(() => {
    if (!handle.noteOpen) {
      noteEditor?.destroy?.();
    }
  });
</script>

<div class="group flex flex-col">
  <!-- 一整个横条 -->
  <div class=" relative w-full">
    <div class="flex w-full flex-row items-center">
      <Overlay>{@render overlay?.()}</Overlay>
      <div class="flex w-full flex-row items-center">
        {@render handleSlot?.()}
        <div
          bind:this={titleEl}
          class="todoitem w-full"
          style:font-size="large"
          style:text-decoration={isCompleted ? "line-through" : ""}
          style:opacity={isCompleted ? 0.5 : 1}
          use:quill={{ text: task.text, configs, init }}
        ></div>
      </div>
    </div>
    {@render drag?.()}
  </div>
  <!-- 横条下面的东西 -->

  <div class="flex h-2 flex-row items-center pt-1">
    <div class="h-1" style:width="18px"></div>
    {#each sortedEvents as event (event.id)}
      <EventIndicator {event} {isCompleted} />
    {/each}
  </div>

  <Popover.Root bind:open={handle.noteOpen}>
    <Popover.Trigger>
      <div
        style:padding-left="18px"
        style:transition-property="margin"
        class=" {task.events.isEmpty()
          ? '-mt-1'
          : ''}  line-clamp-3 w-full text-ellipsis whitespace-pre-line text-nowrap text-start text-zinc-500 transition"
      >
        {note}
      </div>
    </Popover.Trigger>
    <Popover.Content
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        noteEditor.editor.focus();
      }}
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        // bits-ui 2 在 Portal 容器切换时也会触发 onCloseAutoFocus；
        // 只有真正关闭时才回收焦点并提前销毁编辑器。
        if (handle.noteOpen) return;
        editor?.focus();
        noteEditor?.destroy?.();
      }}
      align="start"
    >
      <NoteEditor
        bind:this={noteEditor}
        fragment={task.noteDoc}
        onClose={() => {
          handle.noteOpen = false;
          return false;
        }}
      />
    </Popover.Content>
  </Popover.Root>
</div>

<style>
  :global(.todoitem .ql-editor) {
    padding-top: 0px;
    padding-bottom: 0px;
    padding-left: 10px;
    padding-right: 15px;
    width: 100%;
    flex-grow: 1;
    text-wrap: nowrap;

    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  :global(.todoitem .ql-editor)::-webkit-scrollbar {
    display: none;
  }

  :global(.todoitem .ql-container) {
    display: flex;
    flex-grow: 1;
  }
</style>
