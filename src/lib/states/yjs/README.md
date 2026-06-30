# Yjs 初始化与同步

Yjs 文档的创建、本地持久化与实时同步。

## 文件

| 文件 | 说明 |
|------|------|
| `load.ts` | Yjs 文档初始化、IndexedDB 持久化、Liveblocks 实时同步 |

## 初始化流程

在 `src/App.svelte` 中执行：

```
newYDoc()                        创建 Y.Doc
  ├── loadFromIndexedDB(doc)     本地持久化（y-indexeddb）
  └── loadFromLiveBlocks(doc)    实时同步（@liveblocks/yjs）
        ↓
  Promise.all([两者都完成])
        ↓
  load(doc) → new Database(doc)  初始化数据层
```

前端在加载完成前显示 Loading 组件，展示各数据源的同步状态。

## 本地持久化

`loadFromIndexedDB(doc)` 使用 `y-indexeddb` 将 `Y.Doc` 持久化到 IndexedDB：

```ts
const p = new IndexeddbPersistence("traceable-yjs", doc);
```

- 数据库名：`traceable-yjs`
- 离线可用，重新上线后自动合并

## 实时同步

`loadFromLiveBlocks(doc)` 使用 `@liveblocks/yjs` 连接 Liveblocks 服务：

```ts
const client = createClient({ authEndpoint: import.meta.env.VITE_LIVEBLOCKS_AUTH_ENDPOINT });
const { room, leave } = client.enterRoom("traceable-yjs");
const p = new LiveblocksYjsProvider(room, doc);
```

- Room 名：`traceable-yjs`
- 认证端点：由 `VITE_LIVEBLOCKS_AUTH_ENDPOINT` 环境变量配置，指向 [认证服务](../../../auth_server/README.md)
- 页面卸载时自动离开 Room

## 与数据层的关系

`load.ts` 仅负责 Yjs 文档的生命周期管理。文档加载完成后交给 `Database`（见 [../meta/README.md](../meta/README.md)）进行结构化数据访问。
