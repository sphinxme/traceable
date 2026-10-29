# 协调层（interaction/）

协调层负责把一次交互涉及的多个关注点（数据变更、settle()、动画、焦点、跨面板路由）按序串起来。它是**流程的所有者**，但不做领域规则，也不做输入解释。

## 组成

| 成员               | 概念职责                                                  |
| ------------------ | --------------------------------------------------------- |
| `Panel.perform`    | 流程唯一所有者：驱动 op、settle()、动画生命周期、焦点时点 |
| `TransitionRun`    | 一次动画的记账对象：两端命名、abort、比较清除             |
| `FocusService`     | 按地址即时解析焦点                                        |
| `DragService`      | 拖拽手势的唯一会话态                                      |
| `KeyboardService`  | metaKey 会话态                                            |
| `CrossPanelFacade` | 跨面板定向路由 + 循环切换游标                             |
| `SegmentRegistry`  | 周历事件段索引                                            |

协调层**不依赖 OutlineOps**：`perform` 接收的是一个返回结果的闭包，结构操作与导航操作因此走同一通道。

## perform 的两条路径

```
非动画：op() → await settle() → 焦点

动画：  源命名（同步 DOM 写）
        → startViewTransition(
            op → 记录结果 → await settle() → 目标命名
          )
        → 等待结果与动画结束
        → 比较清除命名
        → 焦点
```

环境不支持 View Transitions 时，动画被剥离，走非动画路径；启动过渡同步抛错时清理源命名后重入非动画路径，保证 op 至多执行一次。

## 宿主契约 P1–P6

| #   | 保证                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------- |
| P1  | `spec.op()` 至多执行一次；抛异常视同 invalid                                                            |
| P2  | animate 存在时，源命名先于 startViewTransition，op 在回调内执行                                         |
| P3  | Registry 读取只发生在 settle() 之后（挂载与条目实例登记已落定）；cleanup 使用记录的条目实例，不重新解析 |
| P4  | focus 只在结果 ok 时消费；动画路径含 skip                                                               |
| P5  | 结果必 resolve，skip 与异常都收敛为返回值，无悬挂 promise                                               |
| P6  | 并发 perform 不互斥、不排队；后到者隐式 skip 前者动画，各自完成簿记                                     |

## TransitionRun

不是服务、不是总线，而是一次动画的**per-run 记账对象**：

- 全局 nonce + part 后缀生成两端过渡名；
- 源端命名发生在过渡启动前，目标端命名发生在 settle() 后；
- op 失败只记录结果，不动命名——避免退出动画造成重影；
- cleanup 幂等，并且只清除“自己写下的名字”。

## FocusService

按 `OccurrenceRef` 即时解析，没有 pending 存储、没有队列、没有重试。唯一客户是 `perform`；调用时点由 perform 保证（非动画路径 settle() 后，动画路径动画结束后）。解析失败 = no-op + devWarn，绝不命中错误节点。

键盘上下导航不经过 FocusService：事件栈内的条目实例仍然存活，可以直接调用它的走法方法。

## DragService

只存事实，不做逻辑：

```
idle --begin--> dragging --end--> idle
```

写者唯一是 `DnDAdapter`（dragstart / dragend）；组件层只做反应式读（ghost、放置区渲染）。它不认识 ops、perform、Registry。

## KeyboardService

追踪 Meta 键的按下状态，供拖放规则表判断 move / link。构造期注册 window 监听，因此必须在组件初始化上下文构造。

## CrossPanelFacade

跨面板联动采用“先查表，再点名”：

- task 参与者提供“数据域搜索 + reveal”；
- 门面收集各参与者的地址，按 taskId 维护循环游标，选中下一个后**配对回投**给产出它的参与者；
- event 参与者接收高亮/定位路由，当前路由到全部注册的周历实例。

门面不搜索、不呈现，只做路由与游标记忆；没有总线、没有广播式自认领。

## SegmentRegistry 与 WeekPanelController

周历侧按 eventId 索引事件段实例（`SegmentHandle`）。`WeekPanelController` 实现事件参与者：

- hover 高亮是多事件集合；
- reveal 是单槽 + 短时定时器，重复 reveal 重置；
- 定位时选择“离现在最近”的段；
- 同时持有周历滚动记忆。

## 边界

- 不做意图选择与失败 UX（适配层）；
- 不做领域规则（Ops）；
- 不做视觉呈现（组件层）；
- 不持有面板实例（由组件创建并注册）。

`perform` 全分支、TransitionRun 状态机、门面循环算法与段索引细节见对应文件 JSDoc。
