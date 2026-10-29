# Traceable

> 事事可追溯

Traceable 是一个桌面日程管理应用。核心理念是“事事可追溯”——任务可以无限嵌套、双向关联，并与日历日程紧密链接，让每一件事的来龙去脉都清晰可查。

## 核心概念

所有数据基于 Yjs（CRDT）管理，支持离线使用与多设备实时同步。

| 概念        | 说明                                                                               |
| ----------- | ---------------------------------------------------------------------------------- |
| **Task**    | 无限嵌套的大纲条目，支持双向链接（一个任务可出现在多个父任务下），可关联富文本笔记 |
| **Event**   | 日历上的时间块，与 Task 多对一关联，表示计划在某个时间段处理某任务                 |
| **Journal** | 按周/日组织的 Task 容器，本质是 Task + 时间/类型元数据                             |

## 架构一页

一份 Yjs 文档同时被多个视图投影：大纲编辑器、周历、周/日日志。交互大量跨面板，因此应用划分成单向依赖的六层：

```
组件层        纯视图：大纲组件树、周历组件
输入适配层    键位 / 拖放 → 意图
协调层        perform 编排、动画、焦点、拖拽、跨面板路由
视图模型层    已挂载出现的条目实例（ViewHandle）与注册表、面板模型
结构操作层    大纲拓扑的唯一写者
数据层        Entities + PanelState（均 Yjs）
```

`protocol.ts` 提供跨层共享的地址/结果/载荷类型，`app/` 是组合根。完整的层级职责、全局不变量与关键流程见 [apps/desktop/src/lib/README.md](apps/desktop/src/lib/README.md)。

## 仓库结构

```
apps/desktop        Tauri + Svelte 5 桌面端（核心）
apps/auth-server    Liveblocks 认证服务
packages/           预留共享包
```

桌面端内部：页面（`routes/`）只做分栏组合，面板（`panels/`）创建数据入口与协调服务，组件（`components/`）负责渲染与输入事件。

## 数据与启动

```
newYDoc
  ├── IndexedDB（本地持久化）
  └── Liveblocks（实时同步）
        ↓ 加载完成
  Database → AppProvider → AppServices → 页面
```

Yjs 生命周期见 [states/yjs/README.md](apps/desktop/src/lib/states/yjs/README.md)；组合根与启动时序见 [lib/app/README.md](apps/desktop/src/lib/app/README.md)。

## 文档导航

| 主题             | 文档                                                                                |
| ---------------- | ----------------------------------------------------------------------------------- |
| 架构总览与不变量 | [lib/README.md](apps/desktop/src/lib/README.md)                                     |
| 关键流程         | [flows.md](apps/desktop/src/lib/flows.md)                                           |
| 数据层           | [document/README.md](apps/desktop/src/lib/document/README.md)                       |
| 结构操作         | [outline-ops/README.md](apps/desktop/src/lib/outline-ops/README.md)                 |
| 视图模型         | [view/README.md](apps/desktop/src/lib/view/README.md)                               |
| 协调层           | [interaction/README.md](apps/desktop/src/lib/interaction/README.md)                 |
| 输入适配         | [components/adapters/README.md](apps/desktop/src/lib/components/adapters/README.md) |
| 面板层           | [panels/README.md](apps/desktop/src/lib/panels/README.md)                           |
| 大纲组件         | [components/todolist/README.md](apps/desktop/src/lib/components/todolist/README.md) |
| 组合根           | [lib/app/README.md](apps/desktop/src/lib/app/README.md)                             |
| 测试设施         | [tests/README.md](apps/desktop/src/tests/README.md)                                 |

## 开发

使用 Bun 与 npm workspaces，命令见 [AGENTS.md](AGENTS.md) 与 [BRANCHING.md](BRANCHING.md)。
