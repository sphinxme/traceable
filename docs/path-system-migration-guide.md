# 路径管理系统迁移指南

## 概述

本指南详细说明了如何从旧的路径管理方式迁移到新的统一路径管理系统。新系统解决了路径概念混乱、光标位置丢失、职责分离不合理等问题。

## 新旧系统对比

### 旧系统问题

1. **路径概念混乱**
   - `relativePath`、`absolutePaths`、`currentParentPath`、`paths` 概念重叠
   - 缺乏统一的路径标识

2. **光标位置丢失**
   - 组件重构时光标位置无法保持
   - 缺乏自动的光标保存恢复机制

3. **职责分离不合理**
   - `EditorItemState` 承担过多职责
   - 路径计算和状态管理耦合

4. **高耦合问题**
   - `EditorItemState` ↔ `EditorPanelState` 双向依赖
   - 难以独立测试和维护

### 新系统优势

1. **统一的路径模型**
   ```typescript
   interface GlobalPath {
     panelId: string;
     taskPath: TaskProxy[];
     zoomState: { zoomRoot: string | null; zoomDepth: number };
   }
   ```

2. **按需懒加载**
   - 组件只在需要时计算路径
   - 高性能缓存机制

3. **自动光标管理**
   - 透明的光标保存和恢复
   - 支持组件重构时的状态保持

4. **职责清晰分离**
   - PathManager: 路径计算和缓存
   - CursorHistoryManager: 光标状态管理  
   - NavigationController: 导航控制

## 迁移步骤

### 第一步：了解新的架构

新系统包含以下核心组件：

```typescript
// 1. 全局路径接口
import type { GlobalPath } from '$lib/states/path';

// 2. 管理器集合
import { 
  PathManager,
  CursorHistoryManager, 
  NavigationController 
} from '$lib/states/path';

// 3. 便捷Hooks
import { 
  useGlobalPath,
  useCursorPreservation,
  useNavigation 
} from '$lib/states/path/hooks.svelte';
```

### 第二步：创建路径管理系统实例

在应用入口或面板组件中初始化：

```typescript
import { createPathManagementSystem } from '$lib/states/path';

// 创建系统实例
const pathSystem = createPathManagementSystem();

// 设置到上下文
setContext('pathContext', {
  pathManager: pathSystem.pathManager,
  cursorManager: pathSystem.cursorManager, 
  navigationController: pathSystem.navigationController,
  panelId: 'your-panel-id'
});
```

### 第三步：在组件中使用新的Hooks

#### Todo组件示例

```svelte
<!-- Todo.svelte -->
<script lang="ts">
  import { useGlobalPath, useCursorPreservation } from '$lib/states/path/hooks.svelte';
  
  // 获取当前组件的全局路径
  const globalPath = useGlobalPath();
  
  // 使用光标保存恢复功能
  const { saveCursor, restoreCursor, hasPendingRestore } = useCursorPreservation();
  
  let textElement: HTMLElement;
  let cursorIndex = 0;
  
  // 在组件可能重构前保存光标
  function handleTabKey() {
    if (textElement) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        cursorIndex = selection.getRangeAt(0).startOffset;
        saveCursor(cursorIndex);
      }
    }
    
    // 触发缩进操作...
  }
  
  // 组件挂载后恢复光标
  onMount(() => {
    if (hasPendingRestore()) {
      const restored = restoreCursor();
      if (restored && textElement) {
        // 恢复光标位置到textElement
        setCursorPosition(textElement, restored.cursorIndex);
      }
    }
  });
</script>
```

#### Editor面板示例

```svelte
<!-- Editor.svelte -->
<script lang="ts">
  import { useNavigation, usePathContext } from '$lib/states/path/hooks.svelte';
  
  // 获取导航功能
  const navigation = useNavigation();
  
  // 获取路径上下文信息
  const pathContext = usePathContext();
  
  // 导航到指定任务
  async function navigateToTask(targetTask: TaskProxy) {
    if (navigation) {
      const targetPath = pathContext.pathManager.buildGlobalPath(
        pathContext.panelId,
        currentPanelPath,
        createItemStateForTask(targetTask)
      );
      
      const success = await navigation.navigateTo(targetPath);
      if (!success) {
        console.warn('Navigation failed');
      }
    }
  }
  
  // 获取性能统计
  function showPerformanceStats() {
    if (pathContext) {
      const stats = pathContext.getStats();
      console.table(stats);
    }
  }
</script>
```

### 第四步：更新现有的路径相关代码

#### 替换路径计算逻辑

**旧代码：**
```typescript
// 旧的路径计算方式
const absolutePath = [...panelState.paths.value, ...itemState.relativePath];
const pathString = absolutePath.map(task => task.id).join('/');
```

**新代码：**
```typescript
// 使用新的路径管理器
const globalPath = pathManager.buildGlobalPath(panelId, panelPaths, itemState);
const pathString = globalPath.toString();
const absolutePath = globalPath.taskPath;
```

#### 替换光标管理逻辑

**旧代码：**
```typescript
// 手动管理光标状态
let savedCursorPosition: number | null = null;

function saveCursor() {
  savedCursorPosition = getCurrentCursorPosition();
}

function restoreCursor() {
  if (savedCursorPosition !== null) {
    setCursorPosition(savedCursorPosition);
    savedCursorPosition = null;
  }
}
```

**新代码：**
```typescript
// 使用自动光标管理
const { saveCursor, restoreCursor } = useCursorPreservation();

// 保存时只需提供位置
saveCursor(currentCursorPosition);

// 恢复时自动处理
const restored = restoreCursor();
if (restored) {
  setCursorPosition(restored.cursorIndex);
}
```

### 第五步：性能优化和调试

#### 启用调试模式

```typescript
import { createDebugPathManagementSystem, attachDebuggerToGlobal } from '$lib/states/path/debug';

// 创建带调试功能的系统
const { system, debugger } = createDebugPathManagementSystem();

// 在开发环境下附加到全局对象
if (import.meta.env.DEV) {
  attachDebuggerToGlobal(debugger);
}
```

#### 监控性能

```typescript
// 在浏览器控制台中使用
window.__pathSystemDebugger.printSystemReport();
window.__pathSystemDebugger.setLogLevel('debug');
```

#### 组件级调试

```typescript
import { componentDebugTools } from '$lib/states/path/component-integration';

// 注册组件以进行性能监控
componentDebugTools.todo.registerComponent('todo-123', 'task-456');

// 记录渲染性能
const endRender = componentDebugTools.todo.recordRender('todo-123');
// ... 渲染逻辑
endRender();

// 查看性能报告
componentDebugTools.printAllReports();
```

## 常见问题和解决方案

### Q1: 如何处理现有的路径依赖代码？

**A:** 逐步迁移，保持向后兼容：

```typescript
// 过渡期间的兼容适配器
function adaptOldPath(oldPath: number[]): GlobalPath {
  // 将旧的数字路径转换为新的TaskProxy路径
  const taskPath = oldPath.map(index => getTaskFromIndex(index));
  return pathManager.createGlobalPath(panelId, taskPath);
}
```

### Q2: 光标恢复在某些情况下不工作怎么办？

**A:** 检查以下几点：

1. 确保在组件重构前正确保存了光标位置
2. 验证GlobalPath的计算是否正确
3. 检查文本元素是否已正确挂载

```typescript
// 调试光标恢复
const cursorStats = cursorManager.getStats();
console.log('Cursor history:', cursorStats);

const pendingRestores = cursorManager.getPendingRestores();
console.log('Pending restores:', pendingRestores);
```

### Q3: 性能是否有改善？

**A:** 使用性能监控工具验证：

```typescript
// 对比新旧系统性能
const perfReport = debugger.getPerformanceReport();
console.log('Path calculation avg time:', perfReport.buildGlobalPath?.average);

// 查看缓存效果
const cacheStats = pathManager.getCacheStats();
console.log('Cache hit ratio:', cacheStats.totalCached);
```

### Q4: 如何在组件卸载时清理资源？

**A:** 使用组件生命周期钩子：

```typescript
onDestroy(() => {
  // 清理组件相关的缓存
  if (pathContext) {
    pathContext.clearPanelCache();
  }
  
  // 注销组件调试信息
  componentDebugTools.todo.unregisterComponent(componentId);
});
```

## 验证迁移结果

### 关键场景测试

使用内置的验证工具测试关键场景：

```typescript
import { componentDebugTools } from '$lib/states/path/component-integration';

// 运行所有关键场景验证
await componentDebugTools.validateAll();

// 或单独验证特定场景
await componentDebugTools.validator.validateCursorPreservation();
await componentDebugTools.validator.validateNavigationHighlight();
await componentDebugTools.validator.validatePanelZoom();
```

### 手动验证步骤

1. **光标保存恢复**
   - 在Todo项目中输入文本，光标移动到中间位置
   - 按Tab键触发缩进（组件重构）
   - 验证光标是否正确恢复

2. **导航和高亮**
   - 使用highlightTaskSignal进行导航
   - 检查新路径系统的响应速度
   - 验证路径计算的正确性

3. **面板zoom操作**
   - 在深层结构中进行zoom in/out
   - 检查缓存是否生效
   - 监控内存使用情况

## 最佳实践

### 1. 路径计算优化

```typescript
// 批量预计算常用路径
pathManager.preWarmCache(panelId, panelPaths, itemStates);

// 定期清理不再使用的缓存
setInterval(() => {
  pathManager.clearTaskCache(deletedTaskId);
}, 60000);
```

### 2. 光标管理最佳实践

```typescript
// 在适当的时机保存光标
function handleUserAction() {
  // 在可能导致组件重构的操作前保存
  if (willCauseRerender) {
    saveCursor(getCurrentCursorPosition());
  }
  
  performAction();
}

// 使用防抖避免频繁保存
const debouncedSaveCursor = debounce(saveCursor, 100);
```

### 3. 调试和监控

```typescript
// 在开发环境下启用详细日志
if (import.meta.env.DEV) {
  debugger.setLogLevel('debug');
  
  // 定期打印性能报告
  setInterval(() => {
    debugger.printSystemReport();
  }, 30000);
}
```

## 总结

新的路径管理系统提供了：

- ✅ 统一清晰的路径模型
- ✅ 高性能的缓存机制
- ✅ 自动的光标保存恢复
- ✅ 职责清晰的模块划分
- ✅ 完善的调试和监控工具

通过遵循本指南，您可以顺利迁移到新系统，享受更好的开发体验和用户体验。

如果在迁移过程中遇到问题，请查看调试工具的输出信息，或参考组件集成示例。