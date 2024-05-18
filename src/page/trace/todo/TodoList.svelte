<script lang="ts">
    import SortableList from "$lib/SortableList.svelte";
    import Todo from "./Todo.svelte";
    import { Database } from "./data";
    import * as Y from "yjs";
    import type { KeyboardHandler } from "./model";
    import { flip } from "svelte/animate";
    import { fly } from "svelte/transition";

    export let db: Database;
    export let items: Y.Array<string>;
    export let parentTaskId: string;

    export let arrowUpHandle: KeyboardHandler = () => true;
    export let arrowDownHandle: KeyboardHandler = () => true;

    export const focusTop = (index: number) => {
        itemRefs.at(index)?.focus(index);
    };

    export const focusBottom = (index: number) => {
        itemRefs.at(-1)?.focus(index);
    };

    items.observe((event, transaction) => {
        items = event.target;
    });

    let itemRefs: Todo[] = [];
    let spill = false;
</script>

<SortableList
    onMove={(event) => {
        // console.log(event);
    }}
    onSpill={(event) => {
        spill = true;
        event.originalEvent.is_spill = true;
    }}
    onEnd={async (event) => {
        if (event.originalEvent.is_spill) {
            return;
        }

        // console.log(event);
        const taskId = event.item.dataset.taskId;
        if (typeof taskId != "string") {
            throw new Error("no taskId found");
        }
        const fromParentTaskId = event.from.dataset.listId;
        const toParentTaskId = event.to.dataset.listId;

        const oldIndexInFrom = event.oldIndex;
        const newIndexInTo = event.newIndex;

        if (
            fromParentTaskId === toParentTaskId &&
            oldIndexInFrom == newIndexInTo
        ) {
            console.log("not changed");
            return;
        }

        db.doc.transact((transaction) => {
            if (fromParentTaskId == toParentTaskId) {
                if (fromParentTaskId != parentTaskId) {
                    throw new Error(
                        `invalid parent id, event source parent:${fromParentTaskId}, my id:${parentTaskId}`,
                    );
                }
                console.log({ oldIndexInFrom, newIndexInTo });
                items.delete(oldIndexInFrom);
                items.insert(newIndexInTo, [taskId]);
            } else {
                db.getTaskChildren(fromParentTaskId).delete(oldIndexInFrom);
                db.getTaskChildren(toParentTaskId).insert(newIndexInTo, [
                    taskId,
                ]);

                db.changeTaskParentId(taskId, {
                    from: fromParentTaskId,
                    to: toParentTaskId,
                });
            }
        });
    }}
    group={{
        name: "nested",
        put(to, from, dragEl, event) {
            // 解决两边复制还是粘贴的时候可以用 put和pull解决
            // console.log("type:123123");
            // console.log({ to, from, dragEl, event });
            return true;
        },
    }}
    class="todolist"
    listId={parentTaskId}
    forceFallback={true}
    invertSwap={true}
    swapThreshold={0.65}
    handle="div .handle"
    animation={200}
    emptyInsertThreshold={20}
>
    {#each items.toArray() as item, i (item)}
        <div
            animate:flip
            in:fly={{
                duration: 500,
                x: -20,
                y: 0,
                opacity: 0.5,
            }}
            data-task-id={item}
        >
            <Todo
                bind:this={itemRefs[i]}
                arrowUpHandle={(range, context, quill) => {
                    let nextIndex = i - 1;
                    if (nextIndex < 0) {
                        return arrowUpHandle(range, context, quill); // 到头了
                    }
                    itemRefs[nextIndex].focusBottom(range.index);
                    return false;
                }}
                arrowDownHandle={(range, context, quill) => {
                    let nextIndex = i + 1;
                    if (nextIndex >= items.length) {
                        return arrowDownHandle(range, context, quill); // 到头了
                    }

                    itemRefs[nextIndex].focus(range.index);
                    return false;
                }}
                enterHandle={(range, context, quill) => {
                    // 在i下面再加一个
                    const id = db.createTask({
                        id: "",
                        textId: "",
                        text: " ",
                        parentIds: [parentTaskId],
                        isCompleted: false,
                    });
                    items.insert(i + 1, [id]);
                    // FIXME:focus到对应的item里
                    setTimeout(() => {
                        focusTop(i + 1);
                    }, 100);

                    return true;
                }}
                taskId={item}
                {parentTaskId}
                {db}
            />
        </div>
    {/each}
</SortableList>

<style>
    :global(.sortable-ghost) {
        opacity: 0.5; /* 设置透明度，模拟消失效果 */
        /* background-color: black; 或其他颜色，以突出显示占位符 */
        /* 其他样式，如边框、大小调整等 */
    }
</style>
