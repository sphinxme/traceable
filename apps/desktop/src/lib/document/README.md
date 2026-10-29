# 数据层（document/）

数据层是应用的**单一事实源**：全部业务数据与需要跨会话/跨设备共享的 UI 状态都在 Yjs 文档里。它自包含、无 UI/框架依赖，内存中的 Y.Doc 即可承载全部数据语义。

## 组成

```
document/
├── entities/       Store · Task · Event · Journal · UserManager · Database
├── panel-state/    PanelState · PanelStateEntry · FoldTree
└── search.ts       findAllOccurrencePaths · isDescendantOrSelf
```

| 成员          | 职责                                                           |
| ------------- | -------------------------------------------------------------- |
| `Database`    | 顶层编排：组合 Y.Doc、Store、UserManager；导入/导出/清空       |
| `Store`       | Yjs 唯一访问入口：顶层 Map、实体缓存、实体 CRUD、纯实体删除    |
| `Task`        | 多父大纲条目；children / parents / events 双向链接；标题与笔记 |
| `Event`       | 与 Task 多对一关联的时间块                                     |
| `Journal`     | 按周/日组织的 Task 容器（Task + 时间/类型元数据）              |
| `UserManager` | 根任务（rootTask）管理                                         |
| `PanelState`  | 面板持久状态入口（导航路径 + 每 home 折叠树）                  |
| `FoldTree`    | 单个 home 的折叠树访问器；折叠唯一权威                         |
| `search`      | DAG 路径搜索与环谓词                                           |

## Yjs 顶层布局

```
tasks:       Y.Map<Y.Map>     所有 Task
texts:       Y.Map<Y.Text>    Task 标题文本
events:      Y.Map<Y.Map>     所有 Event
journals:    Y.Map<Y.Map>     所有 Journal
panelStates: Y.Map            面板持久状态
user:        Y.Map            用户数据（rootTaskId）
```

`panelStates` 再按面板、home、折叠节点逐层嵌套。折叠节点懒创建：默认不存在 = 展开；根节点代表 home task 自身。精确布局与键名见 `panel-state.ts` JSDoc。

## 为什么折叠与导航在这里

折叠态（谁展开了谁）与导航路径（面包屑栈）需要跨会话、跨设备同步，属于**协作持久状态**。把它们放进 Yjs 后：

- 结构操作可以在**同一个事务**里同时改数据与折叠态（G2）；
- 远端折叠/导航变更经 Yjs 响应式自动传播，不需要镜像状态或广播；
- 数据层不依赖视图层，内存文档即可完整表达应用状态。

滚动位置、hover、拖拽会话等**会话临时状态**不在这里。

## 懒建与懒 GC

- 折叠节点只在需要时创建，因此树天然稀疏；
- 读折叠态时途遇已删除实体键 → 剪除该键（读时懒 GC）；
- 级联删除实体时精确 `pruneTask`；
- 应用装配与数据导入后 `sweep()` 全量兜底。

这三层共同保证 G10：不存在孤儿实体，也不存在孤儿折叠键。

## 边界

- **不做拓扑写入**：创建边、改边、删边、级联删除全部归 `outline-ops`；
- **不做视图状态**：高亮、滚动、拖拽、动画命名不在这里；
- **不做导航策略**：`nav` 只负责持久化，失效截断与兜底归 `EditorPanel` 派生。

实体字段、方法语义、事务边界与响应式桥接细节见各文件 JSDoc。
