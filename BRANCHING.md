# 分支模型规范

> 适配**单人、经常离线**的开发场景——日常一切操作本地完成，远端不是流程依赖。
> `master` 为受保护分支：远端禁止直接 push，只接受 PR 合入；本地 master 只 pull 不 push。

## 模型总览

两个常设分支，外加临时 feature 分支：

| 分支 | 性质 | 语义 | 更新时机 |
|------|------|------|---------|
| `master` | 常设 | 稳定线。每个提交都对应一个**手动测试通过、可构建发布**的状态 | 在线窗口期经 PR 从 develop 合入，合入必打 tag |
| `develop` | 常设 | 工作线。每个 feature 汇集为一个 commit，历史线性 | 随时 |
| `feature/*` | 临时 | 功能/实验的整批开发，反悔可整体丢弃 | 从 develop 切出，squash 合回 develop |

```
master   ●───●───●───●─────────→   develop 的只读镜像，发布点打 tag（PR 合入）
develop  ●───●───●───●───●───●─→   每个 ● = 一个 feature 的 squash commit
              \
feature       ●──●──●            整批开发，squash 合回 develop 只留一个 commit，反悔直接删
```

## 规则

### 1. 日常开发

- 从 develop 切 `feature/<描述>` 分支，整批 commits 在分支上做
- 提交信息遵循 Conventional Commits
- 小步提交，仅在合入develop前squash为一整个commit, 保证历史干净——批次内允许临时 `temp`、`wip` 类提交

### 2. feature 分支纪律

- 从 develop 切出、合回 develop，**永远不直接碰 master**
- 合入用 `git merge --squash`：develop 上每个 feature 只占一个 commit，历史保持线性；合入后反悔用 `git revert <该commit>` 整体退掉
- 禁止长命：一个 feature 分支不应跨多个发布批次，否则与 develop 的分叉会积累冲突
- 默认只在本地；需要备份时随手 push 一下即可，流程不依赖远端

### 3. 发布合入 develop → master（在线窗口期，走 PR）

前提：develop 当前状态**手动测试通过**（核心路径：任务增删改、笔记编辑器、日历、Yjs 同步各过一遍）。

- 日常只需推一个分支：`git push origin develop`
- `master` 只经 PR 更新，本地只 `pull`，永远不 push；PR 合并方式选「Rebase and merge」，与 develop 保持同一条线性历史
- 离线期间一切本地完成，联网后一次性推送即可
