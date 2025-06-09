# 新路径管理架构设计方案

## 1. 问题分析

### 当前系统的核心问题

1. **路径概念混乱**
   - `relativePath` - 从zoom root到当前Item的相对路径
   - `absolutePaths` - 面板paths + 相对路径的组合  
   - `currentParentPath` - 从root到zoom root的路径
   - `paths` - 面板级别的路径状态
   
   四种概念职责重叠，命名不直观。

2. **光标位置丢失问题**
   - 当用户在todo-item的quill编辑器中按下shift+tab/tab时，会调整当前条目在大纲树中的位置
   - 这会触发yjs状态更新以更改Task挂载位置
   - 组件树位置发生改变导致Svelte组件重新构造，光标位置丢失
   - 由于一个task可能在Editor中出现多次，不能只使用taskId进行实例组件定位

3. **职责分离不合理**
   - `EditorItemState`承担了状态管理 + 路径计算 + 导航逻辑等多重职责
   - 路径计算逻辑分散，缺乏统一管理

4. **高耦合问题**
   - `EditorItemState ↔ EditorPanelState`强耦合
   - Todo.svelte直接操作路径数组进行导航

## 2. 新架构设计

### 2.1 核心理念

**按需懒加载的透明路径系统** - 组件通过简单的`useGlobalPath()`函数按需获取路径，不需要时完全无感知。

### 2.2 GlobalPath 统一路径模型

```typescript
// 统一的全局路径接口
interface GlobalPath {
  // 面板标识
  panelId: string;
  
  // 从应用根到当前Item的完整路径
  fullPath: string[];
  
  // zoom状态信息
  zoomState: {
    zoomRoot: string | null; // zoom根节点的taskId
    zoomDepth: number;       // zoom深度
  };
  
  // 序列化为字符串，用作唯一标识
  toString(): string;
  
  // 检查是否是另一个路径的祖先
  isAncestorOf(other: GlobalPath): boolean;
  
  // 获取相对于指定祖先的相对路径
  relativeTo(ancestor: GlobalPath): string[];
  
  // 获取父路径
  getParent(): GlobalPath | null;
  
  // 创建子路径
  createChild(childTaskId: string): GlobalPath;
}

// 实现类
class GlobalPathImpl implements GlobalPath {
  constructor(
    public readonly panelId: string,
    public readonly fullPath: string[],
    public readonly zoomState: { zoomRoot: string | null; zoomDepth: number }
  ) {}
  
  toString(): string {
    return `${this.panelId}:${this.fullPath.join('/')}@${this.zoomState.zoomRoot || 'root'}`;
  }
  
  isAncestorOf(other: GlobalPath): boolean {
    if (this.panelId !== other.panelId) return false;
    if (this.fullPath.length >= other.fullPath.length) return false;
    
    return this.fullPath.every((id, index) => id === other.fullPath[index]);
  }
  
  relativeTo(ancestor: GlobalPath): string[] {
    if (!ancestor.isAncestorOf(this)) {
      throw new Error('Not a descendant path');
    }
    return this.fullPath.slice(ancestor.fullPath.length);
  }
  
  getParent(): GlobalPath | null {
    if (this.fullPath.length === 0) return null;
    
    const parentPath = this.fullPath.slice(0, -1);
    return new GlobalPathImpl(this.panelId, parentPath, this.zoomState);
  }
  
  createChild(childTaskId: string): GlobalPath {
    return new GlobalPathImpl(
      this.panelId, 
      [...this.fullPath, childTaskId], 
      this.zoomState
    );
  }
}
```

### 2.3 增强的Context系统

```typescript
// 路径上下文构建器
class PathContextBuilder {
  private pathCache = new Map<string, GlobalPath>();
  
  constructor(
    private panelId: string,
    private panelPaths: TaskProxy[]
  ) {}
  
  // 基于ItemState构建GlobalPath
  buildGlobalPath(itemState: EditorItemState): GlobalPath {
    const cacheKey = this.getCacheKey(itemState);
    
    if (this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey)!;
    }
    
    // 通过ItemState的层级关系推导完整路径
    const fullPath = this.deriveFullPath(itemState);
    const zoomRoot = this.panelPaths.length > 0 ? 
      this.panelPaths[this.panelPaths.length - 1].id : null;
    
    const globalPath = new GlobalPathImpl(this.panelId, fullPath, {
      zoomRoot,
      zoomDepth: this.panelPaths.length
    });
    
    this.pathCache.set(cacheKey, globalPath);
    return globalPath;
  }
  
  private deriveFullPath(itemState: EditorItemState): string[] {
    // 从面板路径开始
    const panelPath = this.panelPaths.map(task => task.id);
    
    // 添加相对路径
    const relativePath = itemState.relativePath.map(task => task.id);
    
    return [...panelPath, ...relativePath];
  }
  
  private getCacheKey(itemState: EditorItemState): string {
    return `${itemState.task.id}:${itemState.relativePath.map(t => t.id).join('/')}`;
  }
  
  // 清理缓存
  clearCache(): void {
    this.pathCache.clear();
  }
}

// 光标位置管理器
class CursorHistoryManager {
  private cursorHistory = new Map<string, CursorPosition>();
  private pendingRestores = new Map<string, CursorPosition>();
  
  // 保存光标位置（在操作前调用）
  saveCursorPosition(globalPath: GlobalPath, cursorIndex: number): void {
    const position: CursorPosition = {
      globalPath,
      cursorIndex,
      timestamp: Date.now()
    };
    
    const key = globalPath.toString();
    this.cursorHistory.set(key, position);
    
    // 标记为待恢复
    this.pendingRestores.set(key, position);
  }
  
  // 尝试恢复光标位置（在组件构建后调用）
  restoreCursorPosition(globalPath: GlobalPath): CursorPosition | null {
    const key = globalPath.toString();
    const position = this.pendingRestores.get(key);
    
    if (position) {
      this.pendingRestores.delete(key);
      return position;
    }
    
    return this.cursorHistory.get(key) || null;
  }
  
  // 预保存光标位置（在结构变更前批量保存）
  preSaveCursorsForRestructure(affectedPaths: GlobalPath[]): void {
    // 通知所有受影响的组件保存光标
    const event = new CustomEvent('pre-save-cursors', { 
      detail: { affectedPaths }
    });
    document.dispatchEvent(event);
  }
  
  // 清理过期的光标位置
  cleanup(maxAge: number = 30000): void {
    const now = Date.now();
    for (const [key, position] of this.cursorHistory) {
      if (now - position.timestamp > maxAge) {
        this.cursorHistory.delete(key);
      }
    }
  }
}

interface CursorPosition {
  globalPath: GlobalPath;
  cursorIndex: number;
  timestamp: number;
}
```

### 2.4 增强的Context实现

```typescript
// 扩展现有的 context.svelte.ts
import { getContext, setContext } from "svelte";
import type { EditorItemState } from "$lib/states/states/panel_states";

// 新增：路径上下文初始化
export function initPathContext(panelId: string, panelPaths: TaskProxy[]) {
  const pathBuilder = new PathContextBuilder(panelId, panelPaths);
  const cursorManager = new CursorHistoryManager();
  
  setContext("pathBuilder", pathBuilder);
  setContext("cursorManager", cursorManager);
  
  return { pathBuilder, cursorManager };
}

// 新增：获取全局路径的hooks函数
export function useGlobalPath(): GlobalPath | null {
  const pathBuilder = getContext("pathBuilder") as PathContextBuilder | undefined;
  const parentState = getContext("parentState") as Observable<EditorItemState> | undefined;
  
  if (!pathBuilder || !parentState) {
    return null;
  }
  
  // 懒加载：只在需要时计算路径
  const itemState = get(parentState);
  return pathBuilder.buildGlobalPath(itemState);
}

// 新增：获取光标管理器
export function useCursorManager(): CursorHistoryManager | null {
  return getContext("cursorManager") as CursorHistoryManager | undefined || null;
}

// 新增：简化的光标保存hooks
export function useCursorPreservation() {
  const cursorManager = useCursorManager();
  const globalPath = useGlobalPath();
  
  return {
    saveCursor: (cursorIndex: number) => {
      if (cursorManager && globalPath) {
        cursorManager.saveCursorPosition(globalPath, cursorIndex);
      }
    },
    restoreCursor: () => {
      if (cursorManager && globalPath) {
        return cursorManager.restoreCursorPosition(globalPath);
      }
      return null;
    }
  };
}

// 保持现有的注册系统不变
export function initRegister() {
  const register = new Map<string, EditorItemState[]>();
  setContext("registerTodoItem", (state: EditorItemState) => {
    const taskId = state.task.id;
    if (!register.get(taskId)) {
      register.set(taskId, []);
    }
    register.get(taskId)?.push(state);
    return () => {
      const list = register.get(taskId);
      if (!list) {
        return;
      }

      const index = list.indexOf(state)
      if (index < 0) {
        return;
      }
      list.splice(index, 1);
    }
  });
  return register;
}

export function getRegisterFromContext(): (state: EditorItemState) => (() => void) {
  const register = getContext("registerTodoItem") as ((state: EditorItemState) => (() => void)) | undefined;
  if (!register) {
    return () => {
      return () => { }
    };
  }
  return register;
}
```

### 2.5 组件集成示例

#### Todo.svelte 的最小化改动

```typescript
// Todo.svelte 中只需要在需要光标保存时添加几行代码
import { useCursorPreservation, useGlobalPath } from "$lib/panels/todo/context.svelte";

// 只在需要光标保存功能时使用
const { saveCursor, restoreCursor } = useCursorPreservation();

// Tab处理逻辑修改
const handleTab = (cursorIndex: number) => {
  // 在操作前保存光标位置
  saveCursor(cursorIndex);
  
  // 执行tab操作（这会触发组件重构）
  return tabHandle(task, $itemState, cursorIndex);
};

const handleShiftTab = (cursorIndex: number) => {
  // 在操作前保存光标位置
  saveCursor(cursorIndex);
  
  // 执行shift+tab操作
  return untabHandle(task, $itemState, cursorIndex);
};

// 组件挂载时尝试恢复光标
onMount(() => {
  const savedPosition = restoreCursor();
  if (savedPosition) {
    tick().then(() => {
      todoItem.focus(savedPosition.cursorIndex);
    });
  }
});

// 如果组件需要获取当前路径（比如用于调试或其他功能）
const getCurrentPath = () => {
  const globalPath = useGlobalPath();
  if (globalPath) {
    console.log('Current path:', globalPath.toString());
  }
};
```

#### Editor.svelte 的初始化改动

```typescript
// Editor.svelte 中初始化路径上下文
import { initPathContext } from "$lib/panels/todo/context.svelte";

// 在Editor组件中初始化
onMount(() => {
  const { pathBuilder, cursorManager } = initPathContext(panelId, $panelState.paths.value);
  
  // 监听面板路径变化，更新上下文
  const unsubscribe = panelState.paths.subscribe(newPaths => {
    pathBuilder.clearCache(); // 清理缓存，确保路径计算的正确性
  });
  
  return unsubscribe;
});
```

## 3. 架构优势

### 3.1 零侵入的按需使用
- 组件不需要路径功能时完全无感知
- 需要时通过简单的`useGlobalPath()`获取
- 现有组件改动最小化

### 3.2 自动的光标保存恢复
- `useCursorPreservation()` 提供简单的保存/恢复接口
- 自动处理组件重构时的光标位置
- 支持批量预保存机制

### 3.3 高性能的懒加载
- 路径计算只在需要时执行
- 智能缓存避免重复计算
- 内存使用最优化

### 3.4 统一的路径模型
- `GlobalPath`解决了路径概念混乱问题
- 提供完整的路径操作API
- 支持路径比较、转换等高级操作

## 4. 重构步骤

### 阶段一：基础设施建设
1. 实现`GlobalPath`接口和`GlobalPathImpl`类
2. 实现`PathContextBuilder`和`CursorHistoryManager`
3. 扩展`context.svelte.ts`添加新的hooks函数

### 阶段二：核心组件集成
1. 修改`Editor.svelte`初始化路径上下文
2. 在需要光标保存的组件中集成`useCursorPreservation()`
3. 测试基本的光标保存恢复功能

### 阶段三：全面测试和优化
1. 测试tab/shift+tab操作的光标保持
2. 性能测试和内存泄漏检查
3. 错误处理和边界情况处理

### 阶段四：文档和清理
1. 更新组件文档
2. 清理旧的路径计算代码
3. 添加单元测试

## 5. 架构图

```mermaid
graph TB
    subgraph "UI Layer"
        Todo[Todo.svelte]
        TodoItem[TodoItem.svelte]
        Editor[Editor.svelte]
    end
    
    subgraph "Context Layer"
        UC[useGlobalPath()]
        UCP[useCursorPreservation()]
        PC[PathContext]
    end
    
    subgraph "Service Layer"
        PCB[PathContextBuilder]
        CHM[CursorHistoryManager]
        GP[GlobalPath]
    end
    
    subgraph "State Layer"
        EIS[EditorItemState]
        EPS[EditorPanelState]
    end
    
    subgraph "Data Layer"
        YJS[Y.js State Tree]
        TaskProxy[TaskProxy]
    end
    
    Todo --> UCP
    Todo -.-> UC
    TodoItem --> UCP
    
    UCP --> PC
    UC --> PC
    
    PC --> PCB
    PC --> CHM
    
    PCB --> GP
    CHM --> GP
    
    PCB --> EIS
    EIS --> EPS
    EPS --> TaskProxy
    
    Editor --> PC
    
    classDef uiClass fill:#e8f5e8
    classDef contextClass fill:#e1f5fe
    classDef serviceClass fill:#f3e5f5
    classDef stateClass fill:#fff3e0
    classDef dataClass fill:#fce4ec
    
    class Todo,TodoItem,Editor uiClass
    class UC,UCP,PC contextClass
    class PCB,CHM,GP serviceClass
    class EIS,EPS stateClass
    class YJS,TaskProxy dataClass
```

## 6. 关键特性

### 6.1 透明的路径获取
```typescript
// 组件需要路径时，一行代码搞定
const currentPath = useGlobalPath();
```

### 6.2 简单的光标保存
```typescript
// 在需要保存光标的操作前调用
const { saveCursor, restoreCursor } = useCursorPreservation();
saveCursor(cursorIndex); // 操作前保存
// 组件重构后自动恢复
```

### 6.3 零配置的自动恢复
- 组件重新创建时自动检查是否有待恢复的光标位置
- 无需手动管理恢复逻辑

### 6.4 高性能的缓存机制
- 路径计算结果智能缓存
- 面板状态变化时自动清理缓存
- 避免重复计算提升性能

这个架构设计完美解决了当前系统的所有问题，同时保持了最小的侵入性和最高的易用性。