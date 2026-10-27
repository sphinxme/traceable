<script lang="ts">
  /**
   * NoteEditor — 笔记富文本编辑器（基于 ProseKit）。
   *
   * 在 TodoItem 的 Popover 中弹出，提供富文本编辑能力。
   * 编辑器内容绑定到 Yjs `Y.XmlFragment`（`task.noteDoc`），通过 ySyncPlugin 实现实时同步。
   *
   * ## 图片上传流程
   *
   * 1. 用户粘贴/拖放图片 → defineImageUploadHandler 拦截
   * 2. ProseKit 立即创建 blob URL 并插入 `<img src="blob:...">`（即时预览）
   * 3. 异步调用 uploadImage → Tauri HTTP → S3 预签名 URL 上传
   * 4. 上传成功后 ProseKit 自动将 src 从 blob URL 替换为 uploadImage 返回的图片 URL
   * 5. 同时自动 revokeObjectURL（上传失败则不 revoke）
   *
   * @prop fragment - 任务的笔记 Y.XmlFragment（来自 `controller.task.noteDoc`）
   * @prop onClose  - 关闭回调（Shift+Enter 触发）
   */
  import "prosekit/basic/style.css";
  import "prosekit/basic/typography.css";
  import { defineBasicExtension } from "prosekit/basic";
  import {
    createEditor,
    union,
    withPriority,
    defineKeymap,
    Priority,
  } from "prosekit/core";
  import {
    defineYjsKeymap,
    defineYjsCommands,
    defineYjsUndoPlugin,
    defineYjsSyncPlugin,
  } from "prosekit/extensions/yjs";
  import { defineImageUploadHandler } from "prosekit/extensions/image";
  import { defineSvelteNodeView, ProseKit } from "prosekit/svelte";
  import * as Y from "yjs";
  import { onDestroy } from "svelte";

  import BubbleMenuToolbar from "./BubbleMenuToolbar.svelte";
  import ImageNodeView from "./image-node/ImageNodeView.svelte";
  import { uploadImage } from "./image-node/uploadImage";

  interface Props {
    fragment: Y.XmlFragment;
    onClose: () => void;
  }

  let { fragment, onClose }: Props = $props();

  // 覆盖 defineBasicExtension 中的 defineHardBreakKeymap（Shift+Enter 默认插入换行）
  // 需要最高优先级才能胜出
  const shiftEnterClose = withPriority(
    defineKeymap({
      "Shift-Enter": () => {
        onClose();
        return true;
      },
    }),
    Priority.highest,
  );

  // defineBasicExtension() 已包含 defineImage()，只需添加上传 handler 和自定义 node view
  const imageUploadHandler = defineImageUploadHandler({
    uploader: async ({ file }) => {
      return await uploadImage(file);
    },
  });

  // 用 defineSvelteNodeView 替换 image 节点的默认渲染，
  // 组件通过 SvelteNodeViewProps 接收 node/selected/setAttrs 等
  const imageNodeView = defineSvelteNodeView({
    name: "image",
    component: ImageNodeView,
  });

  // 手动组装 defineYjs 的组成部分（keymap/commands/undo/sync），唯独不装 yCursorPlugin。
  //
  // fragment 必须显式传入：项目使用单一中央 Y.Doc（App.svelte 中 newYDoc() 创建），
  // 各任务的 noteDoc 是 `new Y.XmlFragment()` 直接创建后嵌入 tasks Y.Map 的，
  // 并非 `doc.getXmlFragment('prosemirror')` 获取，sync 插件没有可用的默认 fragment。
  //
  // 不装 yCursorPlugin：其 awareness 观察者经 y-prosemirror 全局 setMeta/updateMetas
  // 队列延迟 dispatch，编辑器销毁后队列仍会触发（isDestroyed 守卫从未赋值），
  // 在已销毁的 view 上 dispatch 抛 matchesNode null；且本项目 awareness 未接入
  // Liveblocks、无协作光标需求。未来如需支持：换回 defineYjs 并接入 room.awareness，
  // 届时需一并解决上述销毁时序问题。
  const yjsExtension = withPriority(
    union([
      defineYjsKeymap(),
      defineYjsCommands(),
      defineYjsUndoPlugin({}),
      defineYjsSyncPlugin({ fragment }),
    ]),
    3,
  );

  const extension = union([
    defineBasicExtension(),
    yjsExtension,
    shiftEnterClose,
    imageUploadHandler,
    imageNodeView,
  ]);

  export const editor = createEditor({ extension });

  let destroyed = false;

  /**
   * 主动销毁编辑器（幂等）。必须在 Svelte teardown 移除 DOM 之前调用
   * （由 TodoItem 在 Popover 关闭时触发）。
   *
   * 若等到 teardown 时才 unmount：移除 DOM 会使 @aria-ui 组件
   * （BubbleMenuToolbar 的 inline-popover）的 disconnectedCallback cleanup
   * 走到 updateExtension → plugin 列表变化 → reconfigure → prosemirror-view
   * 销毁并重建全部插件 view → ySyncPlugin view 工厂里的 _forceRerender
   * 在 updateStateInner 内重入 dispatch → ProseMirror 崩溃，异常会中断
   * Svelte 的 destroy_effect 链，Popover 内容树半销毁后永远无法再打开。
   *
   * 提前 unmount 后 EditorInstance.view 为 null，updateExtension 的
   * `if (!view || view.isDestroyed) return` 守卫让后续 cleanup 全部 no-op。
   */
  export function destroy() {
    if (destroyed) return;
    destroyed = true;
    try {
      editor.unmount();
    } catch (e) {
      console.warn("[NoteEditor] editor unmount crashed", e);
    }
  }

  onDestroy(() => {
    destroy();
  });
</script>

<ProseKit {editor}>
  <div {@attach editor.mount} class="min-h-[100px] focus:outline-none"></div>
  <BubbleMenuToolbar />
</ProseKit>
