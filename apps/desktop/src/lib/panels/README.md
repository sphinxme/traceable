# 面板层（panels/）

页面（`routes/`）只负责分栏组合，组件（`components/`）只负责渲染；面板层把数据入口、持久状态与协调服务装配成可渲染的 `Panel` 实例。

## 职责

- **创建面板**：`Editor.svelte` 创建 `EditorPanel`，`Weekly.svelte` 创建 `JournalPanel`，`Week.svelte` 创建 `WeekPanelController`。
- **注册**：面板组件在挂载 `$effect` 中向 `PanelDirectory` 与 `CrossPanelFacade` 注册，cleanup 对称注销。
- **滚动记忆**：编辑器按 homeId 存取 `PanelBase.scrollMemory`；Journal 使用保留键 `"__panel__"`；周历使用 `WeekPanelController.scrollMemory`。
- **路由组合**：页面只组合面板与分栏，不持有业务状态。

## 面板类型

| 面板                  | 模型                                | 能力                                                 |
| --------------------- | ----------------------------------- | ---------------------------------------------------- |
| `EditorPanel`         | 单 home（任意时刻一个）             | 面包屑导航、zoom、从 navRoot 做数据域搜索            |
| `JournalPanel`        | 多 home（15 个 journal 各自一棵树） | 无导航能力；搜索地址 = 挂载地址                      |
| `WeekPanelController` | 周历事件段索引                      | 高亮、定位、滚动记忆；不是 `Panel`，只实现事件参与者 |

> EditorPanel 任意时刻只显示当前 home 一棵树；JournalPanel 同时挂 15 个 journal home，每个 home 是一棵独立的出现树。它们共享同一个面板实例、Registry 与 PanelStateEntry。

## 页面组合

| 路由        | 组合            |
| ----------- | --------------- |
| `/trace`    | 日历 + 编辑器   |
| `/organize` | 周日志 + 编辑器 |
| `/schedule` | 日历 + 周日志   |

编辑器在两个路由复用 `panelId="root"`，周日志复用 `panelId="weekly"`；路由互斥保证 G9。

## 与其他层的关系

- 面板实例由组件创建，组合根不持有；
- 面板是 `perform` 的宿主，但不知道具体 op；
- 面板的 reveal 负责地址归一化与呈现，搜索在面板自身；
- 面板注册到门面后，跨面板联动通过门面定向路由，不使用总线。

面板模型与导航细节见 [view/README.md](../view/README.md)；组合根见 [app/README.md](../app/README.md)。
