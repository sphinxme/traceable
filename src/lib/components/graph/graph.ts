import type { Task } from '$lib/states/meta/task.svelte';
import { DirectedGraph } from 'graphology';
import { allSimplePaths } from 'graphology-simple-path';
import { makeViewIdByPaths } from '../todolist/controller/utils';

function buildGraph(top: Task): DirectedGraph {
    const dag = new DirectedGraph();
    dag.mergeNode(top.id);
    appendChildrenRecursively(dag, top, new Set([top.id]));
    return dag;
}

function appendChildrenRecursively(
    graph: DirectedGraph,
    top: Task,
    visited: Set<string>,
) {
    for (const child of top.children) {
        graph.mergeEdge(top.id, child.id);
        if (!visited.has(child.id)) {
            visited.add(child.id);
            appendChildrenRecursively(graph, child, visited);
        }
    }
}

export interface Occurrence {
    rootViewId: string;
    path: string[];
    viewId: string;
}

/**
 * 对每个 root 建图 + allSimplePaths,
 * 不可达返回 [] 自然过滤。无预筛选, 无缓存。
 */
export function findAllOccurrences(
    roots: { rootViewId: string; panelId: string; rootTask: Task }[],
    target: Task,
): Occurrence[] {
    const results: Occurrence[] = [];
    for (const { rootViewId, panelId, rootTask } of roots) {
        const graph = buildGraph(rootTask);
        const paths = allSimplePaths(graph, rootTask.id, target.id);
        for (const path of paths) {
            results.push({
                rootViewId,
                path,
                viewId: makeViewIdByPaths(panelId, path),
            });
        }
    }
    return results;
}

export function willCreateCycle(targetParent: Task, linkingItem: Task) {
    // linking是否能反过来找到targetParent
    return containsRecursively(linkingItem, targetParent.id);
}

function containsRecursively(top: Task, target: string) {
    for (const child of top.children) {
        if (child.id === target) {
            return true;
        }

        const contains = containsRecursively(child, target);
        if (contains) {
            return true;
        }
    }
}
