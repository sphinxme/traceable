# 测试设施（tests/）

> 本文只讲测试观、环境分工与装置分层；运行命令见 [AGENTS.md](../../../../AGENTS.md)，project 配置见 `vite.config.ts` 注释，装置 API 见各 fixture 的 JSDoc。

## 1. 测试要证明什么

测试的对象是**架构不变量与可观察行为**，不是实现细节。各层不变量与契约集中记录在对应 README：

| 区域      | 守护对象                                                    | 文档                                                                                                                                        |
| --------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 数据/结构 | G1 唯一性、G2 单写者与事务、G10 无孤儿                      | [lib/README.md](../lib/README.md) · [document/README.md](../lib/document/README.md) · [outline-ops/README.md](../lib/outline-ops/README.md) |
| 视图/协调 | G4 登记唯一写者、G6 对称收口、G7 settle 后读取、G8 过渡命名 | [view/README.md](../lib/view/README.md) · [interaction/README.md](../lib/interaction/README.md)                                             |
| perform   | 宿主契约 P1–P6                                              | [interaction/README.md](../lib/interaction/README.md)                                                                                       |
| 组件接线  | W1–W4                                                       | [view/README.md](../lib/view/README.md)                                                                                                     |

一条测试的价值在于：它失败时说明某个不变量被破坏，而不是某段代码换了一种写法。

## 2. 两个世界

测试按「**需要什么能力才能证明**」分流，而不是按模块目录分流。

|          | node                                                     | browser                                                               |
| -------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| 能证明   | 纯函数、状态机、数据结构、契约形状、失败零写入、单事务   | 真实挂载/卸载、effect 收口、DOM 接线、布局、View Transition、渲染时序 |
| 不能证明 | DOM、布局、动画、Svelte 挂载时序                         | —                                                                     |
| 代价     | 毫秒级，无浏览器进程                                     | 启动真实引擎，慢一个数量级                                            |
| 放什么   | 数据层、结构操作、视图/协调层的无 DOM 逻辑、适配层判定表 | 条目实例挂载、perform 全分支、reveal 端到端、组件接线、集成套件       |

判定规则：**能用 node 证明的，绝不放 browser**。只有当用例需要 `document`、`startViewTransition`、真实 Svelte 挂载，或需要读取 settle 之后的 DOM 时，才升级环境。

文件名即环境：`*.test.ts` 归 node，`*.browser.test.ts` 归 browser。同一模块的两种测试相邻放置，环境由后缀决定，不靠配置里的白名单手工维护。

### 为什么是 WebKit

生产运行时是 Tauri 的 WKWebView。browser project 用 Playwright WebKit，与生产同引擎，因此断言的是**将要上线的渲染与动画语义**，不是跨浏览器兼容性。Chromium 不在测试矩阵里：它只能证明一个我们并不发布的运行时。

## 3. 装置分层

测试装置是长期资产，按「世界」逐层叠加，不另起平行的一套：

```
document fixture     数据世界：内存 Y.Doc + Store + PanelState + Ops
      ↓ 加 Panel 替身
view fixture         挂载世界：Registry / 条目实例 / 地址，不含组件
      ↓ 加 Harness 组件
接线世界             真实 Svelte 挂载、effect 收口、DOM part 绑定
      ↓ 加真实组件 / AppServices
集成与组件套件       适配器入口以下的真实全链路、真实 Editor / Weekly / Week
```

| 层         | 代表装置                        | 提供的世界                                       | 消费环境       |
| ---------- | ------------------------------- | ------------------------------------------------ | -------------- |
| 数据       | `fixtures/document.ts`          | 固定 root 的内存文档、建树/地址/事务/快照辅助    | node + browser |
| 挂载替身   | `fixtures/view.ts`              | FakePanel（结构替身）、挂载树搭建                | node + browser |
| 挂载宿主   | `fixtures/TestPanel.ts`         | PanelBase 最小真实子类，保留 perform/reveal 编排 | browser        |
| 接线样板   | `Harness*.svelte`               | 按 W1–W4 收口的条目实例树与真实组件宿主          | browser        |
| 响应式探针 | `fixtures/reactivity.svelte.ts` | effect root 内记录求值，可手动 flush             | node + browser |

纪律：

- 低层装置只扩展、不推翻；新装置优先加进现有层；
- 替身只替换**被测层之外**的协作者，被测逻辑本身不 mock；
- 装置不带业务断言，断言留在用例里。

## 4. 覆盖地图

| 套件      | 位置                                       | 证明什么                                                                    |
| --------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| 环境探针  | `env.node.test.ts` · `env.browser.test.ts` | 基建自身可用：`.svelte.ts` 编译、响应式直读、真实挂载、View Transition 可用 |
| 单元/契约 | 与被测模块同目录的 `*.test.ts`             | 每层的局部不变量与判定矩阵                                                  |
| 视图/时序 | `lib/view/*.browser.test.ts` 等            | 挂载对称、perform 分支表、reveal                                            |
| 集成      | `integration.browser.test.ts`              | adapter → perform → ops → FoldTree → settle → registry → focus 的真实全链路 |
| 组件冒烟  | `components.browser.test.ts`               | 真实 Editor / Weekly / Week 的接线与 Quill 键位返回值语义                   |

集成套件的起点是**适配器入口**；组件套件只证明「真实组件把适配器、条目实例、门面接对了」，不重复集成层的行为覆盖。

## 5. 不覆盖范围

自动化不覆盖真实输入机制与外部运行时，这部分靠手动回归：

- 键盘/拖放用例直接调用适配器方法并合成事件，不经过 Quill 的原生键位分发、浏览器原生拖拽与 Tauri WebView 的拖放协议位；
- 数据使用内存 Y.Doc，不覆盖 IndexedDB 持久化与 Liveblocks 同步；
- 不覆盖 Tauri 窗口行为、深链、文件对话框等原生能力。

把边界写清楚，是为了让「测试绿」不被误读为「终态已验证」。

## 6. 取向

- 每个用例自建内存文档，不共享可变状态；
- `afterEach` 卸载全部挂载，避免 effect 泄漏到下一个用例；
- 失败路径同时断言**零写入**（快照不变）与**事务次数**，而不只断言错误码；
- 断言可观察结果（数据、DOM、焦点、命名）；时序契约本身就是被测行为时，才断言调用顺序；
- 测试名描述行为，不描述实现。
