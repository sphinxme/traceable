# 输入适配层（components/adapters/）

适配层把输入事件翻译成**意图**：选择要做什么、组装一次交互的快照、在失败时给出 UX。它不实现领域规则——环、唯一性、折叠迁移、级联删除全部在 `outline-ops`。

## 职责边界

| 做                                                          | 不做                               |
| ----------------------------------------------------------- | ---------------------------------- |
| 意图选择：Enter 4-case、Tab/untab 目标、拖放 move/link 规则 | 领域规则（Ops 唯一实现）           |
| spec 组装：op 闭包 + animate + focus                        | 编排（`Panel.perform` 唯一所有者） |
| 失败 UX：reason → toast / 静默 / devWarn                    | 领域错误语义定义                   |
| 组件接线契约的适配侧                                        | DOM 呈现与视觉状态                 |

## 成员

| 成员              | 形态             | 职责                                                        |
| ----------------- | ---------------- | ----------------------------------------------------------- |
| `KeyboardAdapter` | 无状态类         | Tab / Shift+Tab / Enter / Shift+Enter / ArrowUp / ArrowDown |
| `DnDAdapter`      | 无状态事件解释器 | dragstart / dragover / drop / dragend；DragService 唯一写者 |
| `actions`         | 自由函数         | `remove` / `addChild` 两个薄意图                            |

适配器是 app 级单例，经 `getAppServices()` 获取。

## 键盘意图

- **Tab**：T 成为前序兄弟的末子；无前序兄弟或 root → 不处理。
- **Shift+Tab**：T 成为父的后一兄弟；root 或父为 root → 不处理。
- **Enter**：四类——空行上浮、子列表插入、父列表前/后位插入、正文截断。
- **Shift+Enter**：笔记开关（出现级状态直写，无 op）。
- **上下键**：走渲染树（感知折叠），直接调用条目实例的方法。

Quill 键位注册留在组件；组件把适配器布尔取反后返回给 Quill（`false` = 已处理）。

## 拖放意图

拖放是长手势，意图分两步捕获：

```
dragstart：定格源侧（task / edge / from / 源条目实例）→ DragService
dragover：规则表 + checkDrop 预检 → dropEffect，纯读零写
drop：定稿目标侧（kind / toParent / toIndex / to）→ 目标面板 perform
dragend：DragService.end，唯一出口
```

规则表由“面板归属 + metaKey”决定：同面板默认 move、metaKey 切 link；跨面板默认 link、metaKey 切 move。被拒路径返回 `none`，根本不产生 perform。

## 失败 UX

| reason                | 呈现                                   |
| --------------------- | -------------------------------------- |
| `cycle` / `duplicate` | toast                                  |
| `notFound`            | 静默 + devWarn（并发失效，提示无意义） |
| `invalid`             | devWarn（防御性，正常链路不可达）      |

失败提示归适配层，perform 与 Ops 零提示。

## 组件接线契约

- 键盘：键位绑定在 TodoItem / Title，handler 返回 `!适配器布尔`；Tab 恒消费。
- 拖放：Handle 只转发 dragstart/dragend；TaskDropable 只转发 dragover/drop，指示条是 dropEffect 的纯投影。
- 组件对 DragService 只读，永不写。

方法级守卫、Enter 分支、拖放规则与 spec 形状见 `keyboard-adapter.ts`、`dnd-adapter.ts`、`actions.ts` 的 JSDoc。
