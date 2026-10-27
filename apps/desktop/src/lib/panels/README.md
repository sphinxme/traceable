# 面板层（panels/）

页面（`routes/`）只负责分栏组合，组件（`components/`）只负责渲染与交互委托；
面板层是两者之间的组装层——把数据入口、持久化状态与交互上下文装配成面板控制器，
再以「面板」为唯一入口暴露给页面（无面板状态时可以是纯包装，但入口约定不变）。

## 逻辑输入 / 输出

- **输入**（来自页面 / 数据层）：数据层入口 `Store`；面板状态持久化
  （Y.Doc panelStates：导航路径 + 折叠状态树）；面板标识 `panelId`
  （逻辑身份，用于 viewId 计算与状态隔离）
- **输出**（面向组件层）：可直接渲染的面板；其控制器实现两组契约——
  `PanelController`（缩放导航能力）与 `TodoLifeCycle`（生命周期回调），
  组件树据此把业务逻辑全部委托给控制器

## controller + panel 架构解决什么问题

1. **状态跨树存活**：缩放导航会整棵销毁/重建 `TodoController` 树，
   面板级状态必须存活于树之外——导航路径由面板控制器持有并经 Yjs 持久化
   （跨会话/设备），滚动位置由交互上下文按 viewId 记忆（会话内）
2. **组件层与具体面板解耦**：大纲组件只依赖 `PanelController` /
   `TodoLifeCycle` 接口，不感知面板差异——同一套组件既支撑可缩放的
   编辑面板（单一 home + 面包屑），也支撑平铺的日志面板
   （多个 Journal 各自为根、不支持缩放）
3. **渲染与逻辑分离**：组件树与控制器树同构，组件只做委托
   （控制器内部架构见下方链接）

## 相关文档

- Todo 控制器与 Action 架构：[components/todolist/README.md](../components/todolist/README.md)
- 面板状态持久化（`PanelStateStore` / `StateStore`）：[states/states/StatesTree.svelte.ts](../states/states/StatesTree.svelte.ts)
