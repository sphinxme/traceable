# lib 架构总览

> 本文只讲概念、分层与结构；类字段、算法、时序细节见源码 JSDoc 与各层 README。

## 1. 问题模型

应用只有**一份 Yjs 事实源**（Task / Event / Journal / PanelState），同时被多个视图投影：大纲编辑器、周历、周/日日志。一次交互往往同时触及数据变更、视图状态、动画、焦点与持久化。

理解整套架构先分清三个词：

| 词                  | 含义                                        | 典型操作         |
| ------------------- | ------------------------------------------- | ---------------- |
| **实体 entity**     | Task / Event / Journal 数据本体，全出现共享 | 改名、完成       |
| **出现 occurrence** | 实体在某面板某 home 下经某条边链的一次呈现  | 折叠、高亮、滚动 |
| **边 edge**         | 父子之间的一条链接                          | Tab、拖拽、删除  |

Task 是**多父 DAG**：同一实体可以在不同父、不同面板出现多次。因此“定位任务 T”必须回答“定位哪一个出现”，结构操作也必须明确作用在哪一条边上。

另一个核心区分是**身份 vs 地址**：

- **身份** = 条目实例（`ViewHandle`），给“当前挂载着的那个出现”发命令，只在一次挂载内存活；
- **地址** = `OccurrenceRef`（`panelId + homeId + path`），查询描述，用时才解析。

身份不从位置推导；跨结构变更的找回一律走地址，不指望条目实例存活。

## 2. 分层与依赖

依赖单向向下；`protocol.ts` 被所有层引用，`app/` 引用所有层。

```
组件层          纯视图：todolist/*、calendar/week/*
输入适配层      KeyboardAdapter / DnDAdapter / actions
协调层          Panel.perform / TransitionRun / FocusService / DragService
                CrossPanelFacade / SegmentRegistry / KeyboardService
视图模型层      Panel / ViewHandle / ViewRegistry / PanelDirectory / settle
结构操作层      OutlineOps（8 op + check）
数据层          Entities + PanelState(FoldTree / NavPaths) + search
                protocol.ts（跨层共享类型，零运行时依赖）
app/            组合根 AppServices + AppProvider
```

| 层         | 只负责                                                   | 不负责                       |
| ---------- | -------------------------------------------------------- | ---------------------------- |
| 数据层     | 单一事实源、实体 CRUD、折叠/导航持久化、DAG 搜索         | 拓扑写入、视图状态           |
| 结构操作层 | 拓扑唯一写者、重校验、事务、post-state 描述符            | DOM、动画、焦点、UX          |
| 视图模型层 | 已挂载出现的条目实例与索引、面板模型、reveal、settle()   | 意图选择、领域规则、动画编排 |
| 协调层     | 一次交互的有序编排、动画记账、焦点、拖拽会话、跨面板路由 | 领域规则、视觉呈现           |
| 输入适配层 | 意图选择、spec 组装、失败 UX                             | 拓扑规则、编排               |
| 组件层     | 渲染、DOM 接线、输入事件转发                             | 业务规则、跨组件协调         |
| 组合根     | 装配服务、依赖注入、启动时序                             | 面板实例（由组件创建）       |

## 3. 核心概念

| 概念                    | 说明                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **home**                | 面板里一棵树的根 task（编辑器 = 导航栈末项；Journal = journal.task；一个面板可有多个 home）                               |
| **navRoot**             | 编辑器面包屑第一项，数据域搜索的根                                                                                        |
| **panelId**             | 面板持久状态键；同键同时至多一个活动面板（路由互斥）                                                                      |
| **settle()**            | 等待 Yjs 事务 → 响应式传播 → 组件挂载/卸载 → 条目实例的登记/注销全部完成；之后才能读 Registry、按地址找回条目实例、设焦点 |
| **搜索地址 / 挂载地址** | `OccurrenceRef` 的两种方言；唯一跨方言桥是 `Panel.reveal` 的归一化                                                        |
| **ChangeDescriptor**    | 结构操作完成后的 post-state 事实，供下游声明式消费                                                                        |

折叠态与导航路径属于**协作持久状态**，因此放在数据层（Yjs）；滚动、hover、拖拽会话属于**会话临时状态**；高亮截止时刻、笔记开关属于**条目实例自己的 UI 状态**。

## 4. 全局不变量

| #   | 不变量                                                                           | 守护者                  |
| --- | -------------------------------------------------------------------------------- | ----------------------- |
| G1  | 同一 parent 下子节点唯一                                                         | Task + Ops              |
| G2  | Ops 是大纲拓扑唯一写者；数据 + 折叠同事务                                        | OutlineOps              |
| G3  | FoldTree 是折叠唯一权威；`handle.folded` 只是通道                                | FoldTree                |
| G4  | Registry 是挂载索引的唯一写者                                                    | ViewRegistry            |
| G5  | 条目实例只在一次挂载内有效；跨变更找回走地址                                     | 全链路                  |
| G6  | 每组件一个 effect 收口登记/接线/注销，对称                                       | 组件层                  |
| G7  | Registry / FocusService 的读取只发生在 settle() 之后（挂载与条目实例登记已落定） | perform / TransitionRun |
| G8  | 过渡命名两端同步 DOM 写，同一 run 设置并比较清除                                 | TransitionRun           |
| G9  | 同一 panelId 同时至多一个活动面板                                                | PanelDirectory          |
| G10 | 不存在孤儿实体；不存在孤儿折叠键                                                 | Ops + PanelState        |
| G11 | 跨层出现引用只有 OccurrenceRef 一种形式                                          | protocol.ts             |

## 5. 状态归属

| 状态                      | 归属                     | 持久性       |
| ------------------------- | ------------------------ | ------------ |
| 文档数据                  | Store                    | Yjs          |
| 折叠态                    | FoldTree                 | Yjs          |
| 导航路径                  | PanelStateEntry.navPaths | Yjs          |
| 滚动记忆                  | 面板 / 周历控制器        | 会话         |
| 拖拽会话                  | DragService              | 会话         |
| 循环切换游标              | CrossPanelFacade         | 会话         |
| hover / reveal 高亮       | WeekPanelController      | 会话         |
| noteOpen / highlightUntil | ViewHandle               | 条目实例局部 |
| 拖放指示条                | TaskDropable             | 组件局部     |

## 6. 关键流程

流程骨架单独成篇：[flows.md](flows.md)。

## 7. 分层文档

| 主题         | 文档                                                           |
| ------------ | -------------------------------------------------------------- |
| 关键流程     | [flows.md](flows.md)                                           |
| 数据层       | [document/README.md](document/README.md)                       |
| 结构操作     | [outline-ops/README.md](outline-ops/README.md)                 |
| 视图模型     | [view/README.md](view/README.md)                               |
| 协调层       | [interaction/README.md](interaction/README.md)                 |
| 输入适配     | [components/adapters/README.md](components/adapters/README.md) |
| 面板层       | [panels/README.md](panels/README.md)                           |
| 大纲组件     | [components/todolist/README.md](components/todolist/README.md) |
| 组合根       | [app/README.md](app/README.md)                                 |
| Yjs 生命周期 | [states/yjs/README.md](states/yjs/README.md)                   |

类级技术细节一律以源码 JSDoc 为准：`protocol.ts`、`document/panel-state/*`、`outline-ops/ops.ts`、`view/panel.svelte.ts`、`interaction/transition-run.ts`、`components/adapters/*`。
