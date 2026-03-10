import type { Task } from '$lib/states/meta/task.svelte';
import { DirectedGraph } from 'graphology';
import { allSimpleEdgePaths } from 'graphology-simple-path';
import { makeViewIdByPaths } from '../todolist/controller/utils';

function buildGraph(top: Task): DirectedGraph {
    const dag = new DirectedGraph();
    dag.addNode(top.id);
    appendChildrenRecurively(dag, top)

    return dag;
}

function appendChildrenRecurively(graph: DirectedGraph, top: Task) {
    for (const child of top.children) {
        graph.addNode(child.id);
        graph.addEdge(top.id, child.id);
        appendChildrenRecurively(graph, child);
    }
}

function findPaths(top: Task, target: Task) {
    const dag = buildGraph(top);
    return allSimpleEdgePaths(dag, top.id, target.id);

}

export function findViewIdAndPaths(panelId: string, panelHome: Task, target: Task) {
    const paths = findPaths(panelHome, target);
    const pathAndViewIds = paths.map(path => {
        return {
            path,
            viewId: makeViewIdByPaths(panelId, path)
        }
    });



    return pathAndViewIds;
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
