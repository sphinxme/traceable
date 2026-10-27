# Yjs 初始化与同步

Yjs 文档的生命周期管理，仅含 `load.ts`：创建 Y.Doc、IndexedDB 本地持久化、Liveblocks 实时同步。

## 初始化流程（编排于 App.svelte）

```
newYDoc()                        创建 Y.Doc
  ├── loadFromIndexedDB(doc)     本地持久化（y-indexeddb）
  └── loadFromLiveBlocks(doc)    实时同步（@liveblocks/yjs）
        ↓ Promise.all
  load(doc) → new Database(doc)  交给数据层（见 ../meta/README.md）
```

加载完成前 App 显示 Loading 组件；各函数细节（含失败语义）见 `load.ts` JSDoc。
Liveblocks 认证端点由 `VITE_LIVEBLOCKS_AUTH_ENDPOINT` 配置，对应 [auth-server](../../../../../auth-server/README.md)。
