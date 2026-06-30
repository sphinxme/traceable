# 面板状态管理

面板 UI 状态（导航路径、折叠状态）通过 Yjs 持久化，保持跨会话和跨设备一致。

## 文件

| 文件 | 说明 |
|------|------|
| `StatesTree.svelte.ts` | `PanelStateStore` 和 `StateStore` |

## PanelStateStore

面板级别的状态管理，每个面板（由 `panelId` 标识）对应一个实例。

**Yjs 结构**（存储在 `Y.Doc` 的 `panelStates` Map 下）：

```
panelStates (Y.Map)
  └── {panelId} (Y.Map)
        ├── __paths__: string[]      导航路径（Task ID 数组，从根到当前 home）
        └── {taskId} (Y.Map)         子状态树（StateStore）
              ├── __folded__: boolean
              └── {childTaskId} ...  递归
```

**关键方法**：

- `getOrCreateFromParentYMap(statesStore, panelId, rootTaskId)` — 工厂方法
- `getPaths()` / `savePaths(paths)` — 读写导航路径
- `createHomeByPaths(paths)` — 沿路径创建/获取折叠状态树，返回根 `StateStore`

## StateStore

单个 Task 条目的折叠状态，生命周期与对应的 `TodoController` 绑定。

- `$folded` — 响应式读写折叠状态（`$state` + Yjs observe 双向同步）
- `getChild(taskId)` — 获取子节点的 StateStore
- `receiveChild(another)` — 将另一个 StateStore 收编为子节点（用于拖拽移动任务时迁移状态）
- `destroy()` — 解除 Yjs observe，可重复调用

折叠状态树镜像 Task 的层级结构，每个节点通过 Task ID 索引。
