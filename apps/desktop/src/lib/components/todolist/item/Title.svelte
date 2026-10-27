<script lang="ts">
  /**
   * Title — 根条目标题组件（root 控制器的条目渲染器）。
   *
   * 由 `TodoView` 渲染，与 `TodoItem`（子条目渲染器）相对应：
   * root 控制器渲染为 Title，child 控制器渲染为 TodoItem。
   *
   * - Quill 编辑器由 `quill` action 创建并绑定 `task.text`（y-quill → Yjs Y.Text）
   * - 键盘绑定：ArrowDown → `keyboardActions.navigateDown`；Enter → `keyboardActions.enter`；
   *   Shift+Enter → 仅阻止默认（标题上不开启笔记）；ArrowUp → 预留未实现
   * - 焦点回调：`focusActions.onfocus` 赋值为 `editor.setSelection`
   * - View Transition：`$titleViewTransitionName` 用于缩放时标题 ↔ 条目的形变动画
   *
   * @prop controller - 面板根 TodoController
   * @prop highlightTitle - 是否在标题左侧显示高亮竖线
   *   （周/日日志面板用于标记当前周/日的 home task）
   */
  import { quill } from "$lib/components/quill/quill";
  import Quill, { type QuillOptions } from "quill";
  import type { TodoController } from "../controller/TodoController.svelte";

  interface Props {
    controller: TodoController;
    highlightTitle?: boolean;
  }

  let { controller, highlightTitle }: Props = $props();

  const configs: QuillOptions = {
    modules: {
      toolbar: false,
    },
    theme: "bubble",
    placeholder: "",
  };

  const init = (editor: Quill) => {
    editor.keyboard.addBinding({
      key: "ArrowUp",
      handler(range, curContext, binding) {
        // TODO:
        // return controller.keyboardActions.navigateUp(range.index);
      },
    });
    editor.keyboard.addBinding({
      key: "ArrowDown",
      handler(range, curContext, binding) {
        return controller.keyboardActions.navigateDown(0);
      },
    });
    editor.keyboard.bindings["Enter"].unshift({
      key: "Enter",
      shiftKey: false,
      handler(range, curContext, binding) {
        controller.keyboardActions.enter(range, curContext, this.quill);
        return true;
      },
    });
    // editor.keyboard.addBinding()
    editor.keyboard.bindings["Enter"].unshift({
      key: "Enter",
      shiftKey: true,
      handler(range, curContext, binding) {
        return true;
      },
    });

    controller.focusActions.onfocus = (cursorIndex) => {
      editor.setSelection(cursorIndex);
      return true;
    };
  };
</script>

<!-- svelte-ignore a11y_missing_content -->
<h1
  class="traceable-quill-title group relative scroll-m-20 py-4 text-3xl font-bold tracking-tight transition-colors first:mt-0"
  style:view-transition-name={controller.transitionActions
    .$titleViewTransitionName}
>
  {#if highlightTitle}
    <div
      class=" absolute h-full rounded-full bg-zinc-300 transition duration-500 group-hover:bg-zinc-500"
      style:width="2px"
    ></div>
  {/if}
  <div use:quill={{ text: controller.task.text, configs, init }}></div>
</h1>

<style>
  :global(.traceable-quill-title .ql-container) {
    font-size: xx-large;
    padding-top: 0px;
    padding-bottom: 0px;

    /* display: flex; */

    /* flex-grow: 1; */
    /* padding
		
		-bottom: 2px; */
  }
  :global(.traceable-quill-title .ql-editor) {
    padding-top: 0px;
    padding-bottom: 0px;
    /* padding-top: 12px; */
    width: 100%;
    flex-grow: 1;
    /* padding-bottom: 2px; */
  }
</style>
