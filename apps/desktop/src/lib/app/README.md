# 组合根（app/）

组合根负责把数据层、结构操作、视图模型、协调层与输入适配装配成一组 app 级服务，并在应用启动后注入组件树。

## 启动时序

```
App.svelte
  newYDoc
    ├── loadFromIndexedDB
    └── loadFromLiveBlocks
          ↓ 两者完成
  new Database(doc)
  <AppProvider db>
        ├── new AppServices(db)
        ├── setAppServices(...)
        └── Router → 页面 → 面板组件
```

Y.Doc 加载完成前显示 Loading；`AppProvider` 只在加载完成后的 then 分支挂载，因此服务构造不会早于数据就绪。

## AppServices

组合根持有：

- `Database` / `Store` / `PanelState`
- `OutlineOps`
- `PanelDirectory` / `CrossPanelFacade`
- `DragService` / `KeyboardService` / `FocusService`
- `KeyboardAdapter` / `DnDAdapter`

构造顺序按依赖单向推进，末尾执行 `panelState.sweep()` 做装配期兜底清理。面板实例**不在**组合根中——由 `Editor` / `Weekly` / `Week` 组件创建，并在挂载 effect 中注册。

## 注入方式

服务采用**模块级单例注入**，不是 Svelte Context：

- `setAppServices` 由 AppProvider 在组件初始化期调用；
- `getAppServices` 可在组件初始化期与**事件处理栈**内调用；
- Context 在事件回调内不可读，而适配器/组件回调查询服务发生在事件栈内。

这保证了适配器、面板组件、路由都能以同一方式获取服务，同时保留“未注入即 throw”的失败早退。

## 路由与面板

| 路由        | 组合                                                     |
| ----------- | -------------------------------------------------------- |
| `/trace`    | 日历 + 编辑器（panelId = `root`）                        |
| `/organize` | 周日志（panelId = `weekly`）+ 编辑器（panelId = `root`） |
| `/schedule` | 日历 + 周日志（panelId = `weekly`）                      |
| `/settings` | 设置                                                     |

同一 panelId 会在不同路由复用持久状态；路由互斥保证同一时刻只有一个活动面板实例（G9）。面板组件挂载时注册到 `PanelDirectory` 与 `CrossPanelFacade`，卸载时对称注销。

## 边界

- 组合根只负责装配与注入，不持有面板实例、不做交互编排；
- 启动加载失败/超时语义归 `states/yjs/load.ts`；
- 数据导入导出与清空入口在设置页，导入后会再次执行 `panelState.sweep()`。

构造字段与生命周期细节见 `context.svelte.ts`、`AppProvider.svelte` 的 JSDoc。
