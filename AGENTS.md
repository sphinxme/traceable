## Commands

1. Monorepo 结构（npm workspaces）：`apps/desktop`（Tauri+Svelte5 桌面端）、`apps/auth-server`（认证服务）、`packages/`（预留共享包）

2. 使用Bun作为包管理器和运行时

- 安装依赖（仓库根目录）: `bun install`
- lint检查（desktop）: `cd apps/desktop && bun run check`
- 类型检查（auth-server）: `cd apps/auth-server && bun run check`
- 添加前端依赖: `cd apps/desktop && bun add xxx`
- 格式化: `bun fmt`（仅检查: `bun fmt --check`）

3. ./temp 用于存放临时文件, ./specs 用与存放中间计划文件

## 分支与提交

开 `feature/*` 分支、开发完成后squash 合回 develop；详见 [BRANCHING.md](BRANCHING.md)。
遵循 Conventional Commits，中文描述。
