# 快速开始：移除 RxDB 残余代码

**分支**: `001-remove-rxdb` | **日期**: 2025-12-31

## 概述

本快速开始指南描述如何从 Traceable 项目中移除 RxDB 依赖。移除是安全的，因为 RxDB 已在之前的版本中被 Yjs + y-indexeddb 替代，代码库中已不再使用。

## 前提条件

- 已安装 Deno
- 项目已克隆到本地
- 确保在 `001-remove-rxdb` 分支上

## 实施步骤

### 第 1 步：编辑 package.json

从 dependencies 部分移除 RxDB：

```json
// package.json - 删除这一行：
"rxdb": "^15.37.0",
```

从 trustedDependencies 中移除 RxDB：

```json
// package.json - 从数组中删除 "rxdb"：
"trustedDependencies": [
  "esbuild",
  "protobufjs",
  "rxdb",  // 删除这一行
  "svelte-preprocess"
]
```

### 第 2 步：重新生成 Deno 锁文件

运行 Deno 以使用更新后的依赖项重新生成锁文件：

```bash
deno install
```

或者运行：

```bash
deno cache --reload
```

### 第 3 步：验证类型检查

运行类型检查器以确保没有隐藏的导入问题：

```bash
deno run --allow-read --allow-write npm:check
# 或者
deno task check
```

预期输出：没有与 RxDB 相关的错误。

### 第 4 步：构建项目

运行生产构建：

```bash
deno task build
# 或
deno run --allow-all npm:build
```

预期输出：构建成功完成，没有 RxDB 相关错误。

### 第 5 步：开发环境测试

启动开发服务器：

```bash
deno task dev
# 或
deno run --allow-all npm:dev
```

验证：
- 应用程序正常加载，无错误
- Yjs 存储库正确初始化
- 现有功能正常工作

### 第 6 步：（可选）清理 Deno 缓存

如果要删除缓存的 rxdb 模块：

```bash
deno cache --reload
```

---

## 验证清单

- [ ] package.json 中不再包含 `"rxdb": "^15.37.0"`
- [ ] package.json 的 trustedDependencies 中不再包含 `"rxdb"`
- [ ] deno.lock 已重新生成
- [ ] `deno task check` 通过，没有错误
- [ ] `deno task build` 成功完成
- [ ] 应用程序在开发模式下正常运行
- [ ] 控制台没有与 RxDB 相关的错误

---

## 回滚计划

如果移除 RxDB 后遇到问题，恢复原始 package.json 条目：

```json
// package.json - 恢复这些条目：

"dependencies": {
  ...
  "rxdb": "^15.37.0",
  ...
}

"trustedDependencies": [
  ...
  "rxdb",
  ...
]
```

然后再次重新生成 deno.lock。

---

## 预期影响

- **打包体积**：减少 RxDB 包（约 500KB-1MB，取决于 tree-shaking）
- **安装时间**：由于依赖项减少，稍微更快
- **运行时行为**：无变化（RxDB 未被使用）
- **安全状况**：有所改善（需要更新的依赖项更少）