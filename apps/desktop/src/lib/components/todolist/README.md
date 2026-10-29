# Todo 大纲组件

无限嵌套的大纲视图。组件层是**纯视图**：条目实例（`ViewHandle`）在 script 顶层构造，登记/接线/注销收口于同一个 `$effect`；交互意图在 `components/adapters/`，编排在 `Panel.perform`，领域规则在 `outline-ops`。

## 组件关系

```
TodoView（panel + homeTask；根条目实例）
├── Title（root 标题编辑器）
├── TodoList（统一绑定 list part）
│   ├── TaskDropable（拖放放置槽）
│   └── Todo（子条目实例）
│       ├── TodoItem（标题编辑器 + 事件指示 + 笔记）
│       │   ├── CollapseButton（折叠按钮）
│       │   └── Handle（拖拽手柄 + zoom）
│       └── TodoList（递归）
└── 底部新增按钮 → actions.addChild
```

## 职责

- 渲染大纲树；每个 home 一棵树，以 `homeTask.id` keyed。
- 创建并持有 `ViewHandle`：每个已渲染的条目对应一个条目实例。
- 在 effect 内完成 DOM 接线、注册/注销、焦点与滚动回调。
- 转发输入事件给适配器；不直接调用 Ops，不直接写拓扑。

## 关键约定

- **地址**：跨结构变更的找回一律 `OccurrenceRef`；身份不从位置推导。
- **part 归属**：`self` = TodoView / Todo；`title` = Title / TodoItem；`list` = TodoList（统一含 root）。
- **折叠**：`FoldTree` 是唯一权威；`handle.folded` 只是响应式通道。
- **动画**：`Panel.perform` + `TransitionRun` 统一命名，组件只提供 part 元素与命名接线。
- **焦点**：perform 通过 `FocusService` 按 ref 恢复；上下键直接调条目实例上的走法方法。
- **拖放**：`DragService` 是唯一会话态；ghost 由 Todo 派生读取，组件永不写会话。
- **ghost**：拖拽中的同 taskId 出现自动变暗，不靠遍历或广播。

## 边界

- 不做意图选择（适配层）；
- 不做领域规则（Ops）；
- 不做跨面板协调（门面 / perform）；
- 不持有 app 级服务状态，只读取。

接线契约 W1–W4 的概念说明见 [view/README.md](../../view/README.md)；输入规则见 [adapters/README.md](../adapters/README.md)。
