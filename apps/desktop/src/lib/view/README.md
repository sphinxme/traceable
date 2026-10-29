# 视图模型层（view/）

视图模型层描述**“已经挂载的世界”**：此刻有哪些出现正显示着、它们之间的父子关系、如何按地址找回一个出现，以及一个面板如何承载一棵或多棵 home 树。

它向下只读数据层，向上给协调层与适配层提供条目实例（`ViewHandle`）、地址解析与面板能力；**不写拓扑**。

## 组成

| 成员             | 概念职责                                               |
| ---------------- | ------------------------------------------------------ |
| `ViewHandle`     | 一个已挂载出现的运行时身份 + DOM 接线板 + 出现级状态   |
| `ViewRegistry`   | 每面板一份的挂载索引；地址 → 条目实例                  |
| `PanelBase`      | 面板公共宿主：home 树、搜索、reveal、perform、滚动记忆 |
| `EditorPanel`    | 受导航控制的单 home 面板；支持 zoom / 面包屑           |
| `JournalPanel`   | 多 home 面板；无导航能力                               |
| `PanelDirectory` | panelId → Panel 的 app 级索引                          |
| `settle()`       | 等待挂载与条目实例登记全部落定的原语                   |

## 身份与地址

- **ViewHandle（条目实例）是身份**：每个已挂载的条目都有一个条目实例，用来给“当前挂载着的那个出现”发命令，例如聚焦编辑器、滚动、写过渡命名。它只在一次挂载内存活；reparent / zoom / home 变更都会销毁旧实例。
- **OccurrenceRef 是地址**：`panelId + homeId + path`，用于跨结构变更找回出现。地址是时点快照，消费时可能已失效；失效由 ops 重校验、resolve miss、折叠原语 no-op 各自收敛。

`ViewRegistry.resolve(ref)` 是地址 → 条目实例的唯一入口；折叠或未挂载的节点天然 miss。

## ViewRegistry

每个面板一份，维护三处索引：

- `handle.parent.children`：挂载树；
- `#roots`：homeId → 根条目实例；
- `#byTask`：taskId → 已挂载出现集（调试/扩展查询）。

它是这三处索引的**唯一写者**（G4）。读取纪律（G7）：只允许在 settle() 之后读取；`cleanup` 不 re-resolve，而是使用记录下来的条目实例做比较清除。

## Panel 家族

面板的挂载根是 home。一个面板可以只挂一个 home，也可以同时挂多个 home：

- **EditorPanel** 任意时刻只有一个当前 home（导航栈末项）；
- **JournalPanel** 同时挂 15 个 journal home，每个 journal.task 各自是一棵独立的出现树。

这些 home 共享同一个面板实例、同一个 Registry 与同一个 PanelStateEntry，只是根不同。所以“一个面板下有一组树”只是“多个 home”的直接结果，不是额外的数据结构。

**EditorPanel** 是受导航控制的单 home 面板：

- 导航栈持久在 Yjs；
- 派生出的 `navTaskList` 做失效截断与 navRoot 兜底；
- `navigate / popTo / zoomInto` 把导航包装成 nav-op，走统一 perform；
- 数据域搜索从 navRoot 出发，不受当前 zoom 位置限制；
- `reveal` 的归一化可在跨 home 时自动导航。

**JournalPanel** 同时挂 15 个 journal home：

- home 由时间窗函数注入；
- 无导航能力（类型表达，不暴露 navigate/popTo）；
- 搜索地址与挂载地址同形。

`PanelDirectory` 是 app 级的 panelId → Panel 索引，并用 dev 断言守护 G9：同一 panelId 同时至多一个活动实例。

## settle()

`settle()` 等待“Yjs 事务 → 响应式传播 → 组件挂载/卸载 → 条目实例的登记/注销”全部完成。

它是 G7 的前提：Registry 读取、目标命名、焦点恢复都必须发生在 `settle()` 之后。

## reveal

`Panel.reveal(ref)` 是呈现一个出现的复合动作：

```
归一化地址 → 展开祖先链 → await settle() → 按地址找回条目实例 → 可选滚动 / 高亮
```

- 归一化是搜索地址 → 挂载地址的唯一桥；编辑器可在此自动导航；
- 展开写 FoldTree（数据层权威），不是条目实例的镜像；
- resolve 在 `settle()` 之后，确保折叠/导航导致的挂载变化已经完成。

## 组件接线契约

| #   | 契约                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------- |
| W1  | 条目实例构造在组件 script 顶层（纯分配）；登记/接线/注销对称收口于同一个 `$effect`                    |
| W2  | part 归属固定：`self` = TodoView / Todo；`title` = Title / TodoItem；`list` = TodoList（统一含 root） |
| W3  | TodoView 必须以 `homeTask.id` keyed；home 变更整树重建，产生新的根条目实例                            |
| W4  | 组件对条目实例只做 effect 接线与折叠通道写入，其余只读                                                |

## 边界

- 不做意图选择与失败 UX（适配层）；
- 不做环、唯一性、级联等领域规则（Ops）；
- 不做动画编排与焦点策略（协调层）；
- 不持 DOM 引用之外的视图知识。

类骨架、resolve 算法、条目实例的状态归属与边界表见对应文件 JSDoc。
