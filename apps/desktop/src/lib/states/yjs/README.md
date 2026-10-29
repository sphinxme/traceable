# Yjs 初始化与同步

Yjs 文档的生命周期管理，仅含 `load.ts`：创建 Y.Doc、IndexedDB 本地持久化、Liveblocks 实时同步。

## 初始化流程（编排于 App.svelte）

```
newYDoc()                        创建 Y.Doc
  ├── loadFromIndexedDB(doc)     本地持久化（y-indexeddb）
  └── loadFromLiveBlocks(doc)    实时同步（@liveblocks/yjs）
        ↓ Promise.all
  new Database(doc)              交给组合根
  └── AppProvider                构造 AppServices 并注入（组件初始化期）
```

加载完成前 App 显示 Loading 组件；组合根装配见 [app/README.md](../../app/README.md)。
各函数细节（含失败语义）见 `load.ts` JSDoc；Liveblocks 认证端点由 `VITE_LIVEBLOCKS_AUTH_ENDPOINT` 配置，对应 [auth-server](../../../../../auth-server/README.md)。
