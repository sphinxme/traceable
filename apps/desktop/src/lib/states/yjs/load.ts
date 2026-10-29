import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";

/**
 * Yjs 文档生命周期管理：创建、本地持久化与实时同步。
 *
 * 编排位于 App.svelte：newYDoc() 后并行执行 loadFromIndexedDB / loadFromLiveBlocks，
 * Promise.all 完成后由 App.svelte 构造 Database，并在 AppProvider 组件初始化期装配 AppServices；加载期间显示 Loading。
 */

/** 创建空白 Y.Doc。 */
export function newYDoc() {
  return new Y.Doc();
}

/** y-indexeddb 持久化（库名 traceable-yjs），首次同步完成后 resolve；离线可用，重新上线自动合并。 */
export function loadFromIndexedDB(doc: Y.Doc) {
  return new Promise<void>((resolve, reject) => {
    const p = new IndexeddbPersistence("traceable-yjs", doc);
    p.once("synced", () => {
      console.log("loaded from indexedDB");
      resolve();
    });
  });
}

/**
 * Liveblocks 实时同步：Room 名 traceable-yjs，认证端点由 VITE_LIVEBLOCKS_AUTH_ENDPOINT
 * 配置（见 apps/auth-server），beforeunload 时离开 Room。
 *
 * 已知问题：createClient 抛异常时仅记录日志、Promise 永不 resolve，
 * 应用将停留在 Loading。
 */
export function loadFromLiveBlocks(doc: Y.Doc) {
  return new Promise<void>((resolve, reject) => {
    try {
      const client = createClient({
        authEndpoint: import.meta.env.VITE_LIVEBLOCKS_AUTH_ENDPOINT,
      });
      const { room, leave } = client.enterRoom("traceable-yjs"); // leave
      window.addEventListener("beforeunload", leave);
      const p = new LiveblocksYjsProvider(room, doc);
      p.once("synced", () => {
        console.log("loaded from liveblocks");
        resolve();
      });
    } catch (e) {
      console.log("load from liveblocks error", e);
    }
  });
}
