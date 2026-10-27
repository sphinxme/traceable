# 数据层（meta）

领域模型与 Yjs 数据访问层。所有应用数据基于 Yjs CRDT，经两层抽象管理：

```
Database（顶层编排，全局实例见 src/state.ts）
  ├── Store（Yjs 数据唯一访问入口：CRUD、实例缓存、级联删除）
  │     └── Task / Event / Journal（实体代理）
  └── UserManager（根任务管理）
```

Y.Doc 顶层 Map 布局、实体结构、各方法语义与事务边界见对应文件 JSDoc；
Yjs → Svelte 响应式桥接原理见 `reactive-yjs.ts` 与 `reactive-yarray.ts`。
