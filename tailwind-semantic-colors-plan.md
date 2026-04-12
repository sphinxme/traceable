# Tailwind CSS 语义化颜色改进计划

## 现状分析

### 当前问题
- 项目中大量使用直接的颜色类（如 `bg-zinc-100`, `bg-zinc-300` 等）
- 缺少语义化的颜色命名，难以维护和统一修改
- 不支持暗色模式的一致切换

### 发现的颜色使用模式

| 原始颜色 | 使用场景 | 语义化建议 |
|---------|---------|-----------|
| `bg-zinc-100` | 主应用背景、待办列表连接线、日历非工作时间 | `bg-surface-subtle` |
| `bg-zinc-200` | 侧边栏 hover/激活状态 | `bg-surface-hover` |
| `bg-zinc-300` | 连接线 hover、添加按钮 hover、高亮指示器、拖动手柄 | `bg-surface-hover-strong` |
| `bg-zinc-400` | 已完成事件 | `bg-event-completed` |
| `bg-zinc-500` | 拖拽遮罩、分割线、TODO 状态 | `bg-surface-strong` |
| `bg-zinc-600` | 事件指示器、事件条（未完成） | `bg-event-default` |
| `bg-zinc-700` | 分割线 hover | `bg-surface-strong-hover` |
| `bg-white` | 折叠按钮 | `bg-surface-bright` |
| `bg-gray-200` | 滚动条 | `bg-scrollbar` |
| `bg-gray-300` | 导航栏选中/hover | `bg-surface-active` |
| `bg-gray-400` | 滚动条 hover | `bg-scrollbar-hover` |
| `bg-blue-300` | BLOCK 状态 | `bg-status-block` |
| `bg-red-400` | 当前时间线 | `bg-timeline-current` |

## 技术方案

### 1. 扩展 Tailwind 配置
在 `tailwind.config.ts` 中添加语义化颜色定义：

```typescript
colors: {
  // ... 现有颜色 ...

  // 表面层颜色（背景色）
  surface: {
    subtle: "hsl(var(--surface-subtle) / <alpha-value>)",
    hover: "hsl(var(--surface-hover) / <alpha-value>)",
    "hover-strong": "hsl(var(--surface-hover-strong) / <alpha-value>)",
    active: "hsl(var(--surface-active) / <alpha-value>)",
    strong: "hsl(var(--surface-strong) / <alpha-value>)",
    "strong-hover": "hsl(var(--surface-strong-hover) / <alpha-value>)",
    bright: "hsl(var(--surface-bright) / <alpha-value>)",
  },

  // 事件相关颜色
  event: {
    default: "hsl(var(--event-default) / <alpha-value>)",
    completed: "hsl(var(--event-completed) / <alpha-value>)",
    indicator: "hsl(var(--event-indicator) / <alpha-value>)",
  },

  // 状态颜色
  status: {
    block: "hsl(var(--status-block) / <alpha-value>)",
  },

  // 滚动条颜色
  scrollbar: {
    default: "hsl(var(--scrollbar) / <alpha-value>)",
    hover: "hsl(var(--scrollbar-hover) / <alpha-value>)",
  },

  // 时间线颜色
  timeline: {
    current: "hsl(var(--timeline-current) / <alpha-value>)",
  },
}
```

### 2. 更新 CSS 变量
在 `src/app.css` 中添加新的 CSS 变量：

```css
@layer base {
  :root {
    /* 表面层颜色 */
    --surface-subtle: 240 5% 96%;
    --surface-hover: 240 5% 90%;
    --surface-hover-strong: 240 5% 82%;
    --surface-active: 220 10% 88%;
    --surface-strong: 240 5% 64%;
    --surface-strong-hover: 240 5% 48%;
    --surface-bright: 0 0% 100%;

    /* 事件颜色 */
    --event-default: 240 5% 64%;
    --event-completed: 240 5% 68%;
    --event-indicator: 240 5% 64%;

    /* 状态颜色 */
    --status-block: 217 91% 60%;

    /* 滚动条颜色 */
    --scrollbar: 220 10% 88%;
    --scrollbar-hover: 215 17% 52%;

    /* 时间线颜色 */
    --timeline-current: 0 72% 51%;
  }

  .dark {
    /* 表面层颜色（暗色模式） */
    --surface-subtle: 240 5% 12%;
    --surface-hover: 240 5% 18%;
    --surface-hover-strong: 240 5% 24%;
    --surface-active: 240 5% 20%;
    --surface-strong: 240 5% 36%;
    --surface-strong-hover: 240 5% 50%;
    --surface-bright: 240 5% 8%;

    /* 事件颜色（暗色模式） */
    --event-default: 240 5% 36%;
    --event-completed: 240 5% 32%;
    --event-indicator: 240 5% 36%;

    /* 状态颜色（暗色模式） */
    --status-block: 217 91% 60%;

    /* 滚动条颜色（暗色模式） */
    --scrollbar: 240 5% 20%;
    --scrollbar-hover: 240 5% 32%;

    /* 时间线颜色（暗色模式） */
    --timeline-current: 0 72% 51%;
  }
}
```

### 3. 批量替换策略
按照以下优先级逐步替换：

**优先级 1: 页面面板（Todo、Journal等）**
- `src/lib/panels/todo/Editor.svelte`
- `src/lib/panels/todo/Title.svelte`
- `src/lib/panels/journal/Daily.svelte`
- `src/lib/panels/journal/Weekly.svelte`

**优先级 2: UI 元素（导航栏、侧边栏等）**
- `src/App.svelte`
- `src/lib/components/navbar/NavBarItem.svelte`
- `src/lib/components/sidebar/SidebarItem.svelte`
- `src/lib/components/ui/resizable/pane-resizer.svelte`
- `src/lib/components/ui/scroll-area/scroll-area-scrollbar.svelte`

**优先级 3: 日历和待办列表**
- `src/lib/components/calendar/views/Week.svelte`
- `src/lib/components/calendar/views/WeekEvent.svelte`
- `src/lib/components/todolist/Todo.svelte`
- `src/lib/components/todolist/TodoView.svelte`
- `src/lib/components/todolist/item/event/EventIndicator.svelte`
- `src/lib/components/todolist/item/overlay/Handle.svelte`

**优先级 4: 核心组件（按钮、输入框等）**
- `src/lib/components/ui/` 下的其他组件

### 4. 替换映射表

```typescript
// 背景色替换映射
const bgReplaceMap = {
  'bg-zinc-100': 'bg-surface-subtle',
  'bg-zinc-200': 'bg-surface-hover',
  'bg-zinc-300': 'bg-surface-hover-strong',
  'bg-zinc-400': 'bg-event-completed',
  'bg-zinc-500': 'bg-surface-strong',
  'bg-zinc-600': 'bg-event-default',
  'bg-zinc-700': 'bg-surface-strong-hover',
  'bg-white': 'bg-surface-bright',
  'bg-gray-200': 'bg-scrollbar',
  'bg-gray-300': 'bg-surface-active',
  'bg-gray-400': 'bg-scrollbar-hover',
  'bg-blue-300': 'bg-status-block',
  'bg-red-400': 'bg-timeline-current',
}

// hover 状态替换映射
const bgHoverReplaceMap = {
  'group-hover:bg-zinc-300': 'group-hover:bg-surface-hover-strong',
  'hover:bg-zinc-200': 'hover:bg-surface-hover',
  'hover:bg-zinc-300': 'hover:bg-surface-hover-strong',
  'hover:bg-zinc-700': 'hover:bg-surface-strong-hover',
  'hover:bg-gray-300': 'hover:bg-surface-active',
  'hover:bg-gray-400': 'hover:bg-scrollbar-hover',
  'data-[state=checked]:bg-gray-300': 'data-[state=checked]:bg-surface-active',
}

// text 颜色替换映射（如果需要）
const textReplaceMap = {
  'text-zinc-600': 'text-surface-strong',
  'text-zinc-700': 'text-surface-strong',
  'text-slate-700': 'text-surface-strong',
}

// border 颜色替换映射（如果需要）
const borderReplaceMap = {
  'border-zinc-300': 'border-surface-hover-strong',
  'border-slate-300': 'border-surface-hover-strong',
}
```

## 实施步骤

### 步骤 1: 更新配置文件
1. 修改 `tailwind.config.ts`，添加语义化颜色定义
2. 修改 `src/app.css`，添加 CSS 变量

### 步骤 2: 测试配置
1. 运行 `deno run dev` 确保配置正确
2. 检查是否有语法错误

### 步骤 3: 逐步替换
按照优先级顺序，逐个文件进行替换：
1. 找到文件中所有需要替换的颜色类
2. 使用替换映射表进行替换
3. 运行开发服务器检查效果
4. 确保暗色模式正常工作

### 步骤 4: 验证
1. 检查所有页面在不同主题下的显示效果
2. 运行 `deno run check` 确保没有类型错误
3. 测试所有交互功能

## 注意事项

1. **保留现有功能**: 确保替换后所有功能正常工作
2. **暗色模式支持**: 所有新颜色都必须支持暗色模式
3. **渐进式替换**: 不要一次性替换所有文件，按优先级逐步进行
4. **测试覆盖**: 每次替换后都要测试，确保没有破坏现有功能
5. **代码风格**: 保持代码风格一致

## 预期收益

1. **可维护性提升**: 语义化命名更容易理解和修改
2. **主题切换**: 统一的颜色变量便于实现暗色模式
3. **一致性**: 整个项目的颜色使用更加统一
4. **扩展性**: 新增颜色时只需在配置中添加即可
