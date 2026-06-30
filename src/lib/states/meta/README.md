# 数据层（meta）

领域模型与 Yjs 数据访问层。所有应用数据基于 Yjs CRDT，通过两层抽象管理。

## 架构

```
Database（编排器）
  ├── doc: Y.Doc
  ├── store: Store（数据访问）
  └── userManager: UserManager
```

| 类 | 文件 | 职责 |
|----|------|------|
| `Database` | `database.svelte.ts` | 顶层编排器，持有 `Y.Doc`、`Store`、`UserManager`；提供数据导入/导出 |
| `Store` | `store.svelte.ts` | 直接操作 Yjs 共享类型，负责 Task/Event/Journal 的 CRUD 和实例缓存 |
| `UserManager` | `user.svelte.ts` | 管理 `rootTaskId`，确保根任务存在 |
| `Task` | `task.svelte.ts` | 任务实体 |
| `Event` | `event.svelte.ts` | 事件实体 |
| `Journal` | `journal.svelte.ts` | 日志实体 |

全局实例在 `src/state.ts` 中创建，通过 `db` 导出。

## Yjs 文档结构

`Y.Doc` 中的顶层 Map：

| Yjs Map | 类型 | 内容 |
|---------|------|------|
| `tasks` | `Y.Map<Y.Map>` | 所有 Task 数据 |
| `texts` | `Y.Map<Y.Text>` | Task 标题文本 |
| `events` | `Y.Map<Y.Map>` | 所有 Event 数据 |
| `journals` | `Y.Map<Y.Map>` | 所有 Journal 数据 |
| `panelStates` | `Y.Map` | 面板 UI 状态（见 `../states/README.md`） |
| `user` | `Y.Map` | 用户数据（`rootTaskId`） |

## Task

无限嵌套的大纲条目，支持双向链接。

**Yjs 结构**（`Y.Map`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 唯一标识（`bson-objectid`） |
| `textId` | `string` | 指向 `texts` Map 中的 `Y.Text`（任务标题） |
| `noteDoc` | `Y.XmlFragment` | 富文本笔记（Tiptap 协同编辑） |
| `children` | `Y.Array<string>` | 子任务 ID 列表 |
| `parents` | `Y.Array<string>` | 父任务 ID 列表（双向链接） |
| `events` | `Y.Array<string>` | 关联 Event ID 列表 |
| `status` | `"TODO" \| "DONE" \| "BLOCKED"` | 完成状态 |

**关键方法**：

- `attachChild(child, index?)` / `detachChild(child)` — 双向链接维护，在事务中同时更新双方的 `children` 和 `parents`
- `insertChild(index?, text?)` — 创建子任务并挂载
- `deleteChild(child)` — 若子任务有多个父则仅解除链接，否则彻底删除
- `insertEvent(start, end)` — 创建关联 Event

`children`、`parents`、`events` 通过 `ReactiveYArrayProxy` 封装，提供响应式迭代和查找。

## Event

日历上的时间块，与 Task 多对一。

**Yjs 结构**（`Y.Map`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 唯一标识 |
| `taskId` | `string` | 关联的 Task ID |
| `start` | `number` | 开始时间戳（毫秒） |
| `end` | `number` | 结束时间戳（毫秒） |

**关键方法**：`setPeriod(start, end)`、`moveTo(start)`、`resizeTo(duration)`、`delete()`

`Store.queryEventsByRange(from, to)` 按时间范围查询重叠事件。

## Journal

按周/日组织的 Task 容器。

**Yjs 结构**（`Y.Map`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 由时间和类型生成：`${timestamp}-${type}` |
| `type` | `"WEEK" \| "DAY"` | 日志类型 |
| `taskId` | `string` | 关联的 Task ID |
| `time` | `number` | 时间戳 |

`Store.getOrCreateJournal(key, time, type, text)` 按需创建。

## Store

`Store` 是 Yjs 数据的唯一访问入口，职责包括：

- **CRUD**：`createTask` / `getTask` / `deleteTask`、`createEvent` / `getEvent` / `deleteEvent`、`getOrCreateJournal` / `getJournal`
- **实例缓存**：通过 `Map<string, Task>` 等缓存代理对象，避免重复构造
- **级联删除**：删除 Task 时自动清理关联的 Text、Event，并解除双向链接
- **批量查询**：`allTasks`、`allEvents`、`queryEventsByRange(from, to)`

## Database

顶层编排器，在 `src/state.ts` 中初始化：

```ts
export function load(doc: Y.Doc) {
    db = new Database(doc);
}
```

提供 `export()` / `import(data)` 用于全量数据序列化/反序列化（在事务中执行）。

## 响应式桥接

将 Yjs 的 `observe` 机制桥接为 Svelte 5 Runes 响应式系统。

| 文件 | 说明 |
|------|------|
| `reactive-yjs.ts` | 使用 `createSubscriber`（`svelte/reactivity`）为 `Y.Map`、`Y.Array`、`Y.Text`、`Y.XmlFragment` 创建响应式订阅 |
| `reactive-yarray.ts` | `ReactiveYArrayProxy<T>` 封装 `Y.Array<string>`，提供响应式的类数组访问（迭代、查找、增删、移动） |

**工作原理**：实体类在 getter 中调用 `subscribe()`（由 `createSubscriber` 创建），Svelte 在渲染时自动注册依赖；当 Yjs 数据变化时触发 `update()`，Svelte 标记组件为 dirty 并重新渲染。

```ts
// 示例：Task.status 的响应式读取
get status() {
    this.subscribe();        // 注册 Svelte 响应式依赖
    return this.yMap.get("status");
}
```
