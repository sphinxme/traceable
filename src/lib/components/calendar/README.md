# 日历组件

日历组件，设计上支持多种视图（月视图/周视图），目前仅实现了周视图（Week）。

## 目录结构

按业务含义分组，Controller 和它控制的 Svelte 组件放在同一目录：

```
calendar/
├── Calendar.svelte                        # 入口，接收 Store + view prop，渲染对应视图
│
└── week/                                  # 周视图：一个完整业务单元
    ├── WeekController.svelte.ts           #   周视图控制器（状态 + 逻辑，可单元测试）
    ├── Week.svelte                        #   周视图主组件（薄视图，读 controller 渲染）
    ├── week-config.ts                     #   周视图配置（显示天数、列宽、网格高度）
    │
    ├── DayHeader.svelte                   #   日期表头（星期 + 日期，高亮今天）
    ├── DayGrid.svelte                     #   时间网格（小时刻度 + 非工作时段 + 拖放区域）
    ├── dropZone.svelte.ts                 #   DayGrid 的拖放 Action（interactjs + HTML5 DnD）
    ├── DragPreview.svelte                 #   从 Todo 拖入时的预览块
    │
    ├── layout/                            #   布局基础设施（几何计算 + 布局引擎）
    │   ├── config.ts                      #     常量（日界偏移、时间常量、非工作时段等）
    │   ├── geometry.ts                    #     几何计算（时间↔像素、日界计算、列索引、显示范围）
    │   └── layout.ts                      #     布局引擎（事件切分 + 重叠分列）
    │
    └── event/                             #   事件块子模块（渲染 + 交互）
        ├── WeekEvent.svelte               #     事件块渲染（定位 + Tooltip + 右键菜单）
        ├── WeekEventController.svelte.ts  #     事件拖拽/缩放控制器（可单元测试）
        └── eventInteract.svelte.ts        #     WeekEvent 的交互 Action（薄包装，委托 controller）
```

### 分层原则

| 层 | 目录 | 职责 | 可测试性 |
|----|------|------|----------|
| 纯逻辑 | `week/layout/` | 几何计算、布局引擎，零 Svelte/DOM 依赖 | 纯函数直接测试 |
| 控制器 | `week/WeekController.svelte.ts`、`week/event/WeekEventController.svelte.ts` | 状态管理 + 业务逻辑，使用 `$state`/`$derived` | 实例化后断言状态/调用方法 |
| Svelte Action | `week/dropZone.svelte.ts`、`week/event/eventInteract.svelte.ts` | DOM 适配器（interactjs 绑定），委托控制器 | 需 DOM 环境 |
| 视图 | `week/*.svelte`、`week/event/*.svelte` | 纯展示，读控制器状态，渲染子组件 | Svelte 组件测试 |

### 配置分层

| 文件 | 职责 | 主要常量 |
|------|------|----------|
| `week/layout/config.ts` | 周视图布局常量 | `OFFSET_BY_HOUR`、`MS_PER_DAY`、`DEFAULT_EVENT_DURATION_MS`、`SNAP_THRESHOLD_PX`、`NOT_WORK_HOUR_RANGES` |
| `week/week-config.ts` | 周视图特有 | `DEFAULT_DAY_NUM`、`SIDE_WIDTH`、`SIZE`、`DAY_HEIGHT_PX` |

## Controller-Svelte 架构

### WeekController

`WeekController` 是周视图的核心控制器，持有全部状态和逻辑，`Week.svelte` 仅负责渲染：

```
WeekController
  ├── displayRange          $derived  显示范围（今天为中心，前后各 dayNum 天）
  ├── getColumnIndex        $derived  时间戳→日列索引函数（相对于 displayStartDay）
  ├── events                $derived  从 Store 查询范围内事件
  ├── positionedSegments    $derived  布局引擎输出（事件切分 + 重叠分列）
  ├── dayWidth              $derived  每列像素宽度
  ├── snapsOffset           $derived  15分钟 snap 点的像素偏移数组
  ├── dayHeight             $state    日列高度（由 DayGrid bind 回传）
  ├── containerWidth        $state    容器宽度（由 DayGrid bind 回传）
  ├── scrollAreaRef         $state    滚动容器引用（由 ScrollArea bind 回传）
  ├── draggingTaskEvent     $state    从 Todo 拖入时的预览事件
  ├── nowPercentage         $state    当前时间指示线百分比位置
  │
  ├── onReady()                       启动 now indicator + scroll restore
  ├── destroy()                       停止定时器 + 清理监听器
  ├── handleDragOver()                从 Todo 拖入：更新预览位置
  ├── handleDrop()                    从 Todo 拖入：创建新事件
  └── handleDragEnd()                 从 Todo 拖入：清除预览
```

### WeekEventController

`WeekEventController` 管理单个事件块的拖拽/缩放交互状态，`eventInteract.svelte.ts`（Svelte Action）仅作为 interactjs 的薄包装，将事件委托给控制器：

```
WeekEventController
  ├── state                $state  交互状态（topOffset, eventHeight, previewStart/End, ...）
  │
  ├── updateContext()              同步上下文参数（dayHeight, snapsOffset, getColumnIndex, segStart）
  ├── syncToSegment()              segment 变化时重置状态到初始位置
  ├── refresh()                    拖拽/缩放开始时缓存事件时间和偏移量
  ├── onResizeStart/Move/End()     缩放逻辑（仅 isLast 的 segment 可缩放）
  ├── onDragMove/End()             拖拽逻辑（跨天拖拽 + 15分钟对齐）
  └── onTap()                      点击/双击通知
```

### 视图与控制器的连接

`Week.svelte` 在 `<script>` 顶部创建控制器，通过 `$effect` 驱动生命周期：

```svelte
<script lang="ts">
    const controller = new WeekController(store, dayNum);

    $effect(() => {
        controller.onReady();
        return () => controller.destroy();
    });
</script>

<!-- 模板中直接读 controller 的状态 -->
<DayGrid bind:dayHeight={controller.dayHeight} ... />
{#each controller.positionedSegments as seg}
    <WeekEvent segment={seg} ... />
{/each}
```

## 数据流

`Store` 是数据库层（底层为 Yjs，是唯一事实来源）。控制器层不管理数据，仅负责按显示范围筛选并做布局计算：

```
Store（Yjs，唯一事实来源）
  → WeekController.events        $derived: queryEventsByRange(from, to)
  → WeekController.positionedSegments  $derived: layoutEvents() 按日界切分 + 重叠分列
  → Week.svelte {#each}          渲染 WeekEvent
```

`WeekController` 通过 `$derived` 响应式驱动：Yjs 数据变更时 `Store` 触发 Svelte 更新，筛选与布局引擎重新计算，UI 自动刷新。用户交互（拖拽/缩放）产生的修改直接写回 `Store`（即 Yjs）。

## 日界偏移（offsetByHour）

"一天"的边界不是自然日 00:00，而是 `OFFSET_BY_HOUR`（默认 6，即 06:00）。这意味着：

- 04:00 的事件属于**前一天**的尾部
- 06:00 的事件属于**当天**的头部
- 所有日界计算统一使用 `getDayStart(t, offsetByHour)`（定义在 `week/layout/geometry.ts`），先减偏移再 `startOf("day")` 再加回，确保 00:00~06:00 的事件归到前一日

## 几何计算（week/layout/geometry.ts）

| 函数 | 说明 |
|------|------|
| `getDayStart(t, offsetByHour)` | 计算时间戳所属"日"的起始时刻（考虑偏移） |
| `fractionOfDay(start, end)` | 时间段占一天的比例（可 >1 用于跨天） |
| `calculateTopOffset(start, offsetByHour, dayHeight)` | 事件在日列内的垂直偏移（px） |
| `calculateEventHeight(start, end, dayHeight)` | 事件块像素高度 |
| `calculateDisplayRange(dayNum, offsetByHour)` | 计算显示范围（today、displayDays 等） |
| `makeGetColumnIndex(displayStartDay)` | 构造时间戳→日列索引的函数 |
| `roundToNearest15MinutesDayjs` / `roundToNearest15MinutesPixels` | 15 分钟对齐 |
| `range(start, stop)` | 生成闭区间整数序列（用于刻度迭代） |
| `isRestDay(day)` | 判断是否为休息日（仅周六） |

## 布局引擎（week/layout/layout.ts）

### 处理流程

```
Event[] → segmentEvent()  按日界切分为日列片段
        → allocateLanes() 同日列内重叠分列
        → PositionedSegment[]  排序输出
```

### EventSegment（日列片段）

跨天事件被切分为多个 segment，每个只属于一个日列：

| 字段 | 说明 |
|------|------|
| `dayIndex` | 日列索引（相对于显示起始日） |
| `segStart` / `segEnd` | 裁剪到当天边界后的起止时间戳 |
| `isFirst` / `isLast` | 是否是原始事件的第一个/最后一个片段（控制 resize 权限） |

### PositionedSegment（带分列信息）

| 字段 | 说明 |
|------|------|
| `laneIndex` | 在重叠簇中的列索引（0-based） |
| `laneCount` | 该重叠簇的总列数（簇内所有 segment 共享） |

渲染时通过 `getLaneGeometry(segment, dayWidth)` 计算宽度和左偏移：`width = dayWidth / laneCount`，`left = laneIndex * width`

### 重叠分列算法（allocateLanes）

1. **簇检测**：按 `segStart` 升序排序，线性扫描维护 `clusterMaxEnd`。下一段 start ≥ clusterMaxEnd 则开启新簇
2. **贪心 lane 分配**：对簇内每段，从 lane 0 找第一个空闲 lane（`lanes[i] <= segStart`），找到则复用，否则开新 lane

## 交互

### 事件拖拽与缩放（week/event/）

基于 interactjs 的 Svelte Action（`eventInteract.svelte.ts`），挂载在 `WeekEvent` 上。Action 仅处理 DOM 事件绑定，逻辑由 `WeekEventController` 处理：

| 操作 | 行为 |
|------|------|
| **拖拽移动** | 实时更新预览位置，15 分钟对齐，结束时调用 `event.moveTo(newStart)` 整体平移 |
| **底部缩放** | 仅 `isLast` 的 segment 可缩放，结束时调用 `event.resizeTo(duration)` |
| **点击** | 通过 `eventbus.emit("clickOnWeekEvent")` 通知（双击跳转到对应 Task） |

**跨天拖拽**：通过 `dragOffset = segStart - event.start` 将鼠标位置还原为事件实际 start，`event.moveTo()` 整体平移后其他 segment 由布局引擎自动跟随。

**资源清理**：action 返回 `destroy()` 调用 `interact(node).unset()`，确保组件卸载时移除所有事件监听器。

### 从 Todo 拖入创建事件（dropZone）

`DayGrid` 的每个日列注册为拖放目标。包含两个 Svelte Action：

| Action | 用途 |
|--------|------|
| `dayDropZone` | interactjs dropzone，供事件拖拽时检测目标日列 |
| `dayExternalDropZone` | HTML5 DnD 拖放区，接收从 Todo 列表拖入的 Task |

从 Todo 列表拖拽 Task 到日历：

1. `onDragOver` → 更新 `DragPreview` 位置（默认时长 `DEFAULT_EVENT_DURATION_MS` = 30 分钟，15 分钟对齐）
2. `onDrop` → 调用 `task.insertEvent(start, end)` 创建新事件

### 当前时间指示线

由 `WeekController` 管理，每 10 秒更新一次当前时间在日列中的百分比位置。`destroy()` 同时清除 `setTimeout` 和 `requestAnimationFrame`，避免组件卸载后泄漏。

### 滚动位置记忆

由 `WeekController` 管理，通过 `InteractionContext` 的 `ScrollMemoryService` 持久化日历的滚动位置，切换页面后恢复。
