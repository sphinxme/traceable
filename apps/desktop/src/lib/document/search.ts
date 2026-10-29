import type { Task } from "$lib/document/entities/task.svelte";

/**
 * DAG 路径搜索与环谓词：只依赖实体，纯函数、无 Svelte/DOM 依赖。
 * 按需在调用方限定的子树内 DFS，不做全量建图。
 */

/**
 * 从 root 出发到 targetTaskId 的全部简单路径（不含 root，含 target）。
 * DFS + 路径内 visited 防环；不可达返回 []。
 */
export function findAllOccurrencePaths(
  root: Task,
  targetTaskId: string,
): string[][] {
  if (root.id === targetTaskId) return [[]];

  const paths: string[][] = [];
  const onPath = new Set<string>([root.id]);

  const visit = (task: Task, path: string[]) => {
    for (const child of task.children.toArray()) {
      if (onPath.has(child.id)) continue;

      const childPath = [...path, child.id];
      if (child.id === targetTaskId) {
        paths.push(childPath);
        continue;
      }

      onPath.add(child.id);
      visit(child, childPath);
      onPath.delete(child.id);
    }
  };

  visit(root, []);
  return paths;
}

/** candidateId 是否 ∈ {start} ∪ start 的全部后代（沿 children 向下）。 */
export function isDescendantOrSelf(start: Task, candidateId: string): boolean {
  if (start.id === candidateId) return true;

  const visited = new Set<string>();
  const stack: Task[] = [start];

  while (stack.length > 0) {
    const task = stack.pop()!;
    if (visited.has(task.id)) continue;
    visited.add(task.id);

    for (const child of task.children.toArray()) {
      if (child.id === candidateId) return true;
      stack.push(child);
    }
  }

  return false;
}
