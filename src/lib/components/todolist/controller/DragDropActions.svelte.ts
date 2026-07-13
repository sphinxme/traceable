import type { Task } from "$lib/states/meta/task.svelte";
import { eventbus } from "./eventbus.svelte";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";
import { willCreateCycle } from "$lib/components/graph/graph";
import type { DraggingTaskData } from "$lib/interaction/services/DragService.svelte";

/**
 * Todo 拖放操作处理器 — 管理任务的拖拽与放置（reparenting）。
 *
 * **拖放语义**：
 * - **move**（移动）：从原 parent 移除，添加到新 parent（同 panel 默认 move）
 * - **link**（双向关联）：保留原 parent，添加到新 parent（跨 panel 默认 link）
 * - **copy**（复制）：TODO，暂未实现
 * - **none**（拒绝）：拖到自己/子孙节点、同位置无变化
 *
 * **环检测**：使用 `willCreateCycle`（graph.ts）防止创建循环引用。
 *
 * **状态迁移**：拖放时通过 `StateStore.receiveChild` 同步迁移折叠状态。
 *
 * **交互流程**：
 * 1. 用户按住 Handle → `startDrag()` → `drag.set()` + emit `drag:start`
 * 2. 拖拽经过 `TaskDropable` → `dragOverMe()` → 返回 dropEffect 控制鼠标样式
 * 3. 释放在 `TaskDropable` → `dropIntoMe()` → 执行 reparenting
 * 4. `endDrag()` → emit `drag:end` + `drag.clear()`
 */
export class DragDropActions implements TodoLifeCycle {

	/** 当前条目是否正在被拖拽（控制透明遮罩显示） */
	public $isMeDragging = $state(false);

	/**
	 * @param host 关联的 TodoController
	 */
	public constructor(
		public readonly host: TodoController,
	) { }

	// lifecycle
	public onTodoReady() { }
	public destroy() { }

	/**
	 * 获取全局拖拽服务。
	 * @returns DragService 实例
	 */
	private get drag() {
		return this.host.panel.interaction.drag;
	}

	/**
	 * 开始拖拽 — 设置拖拽数据到 DragService 并广播 `drag:start` 事件。
	 *
	 * 携带的数据包括：originPanelId、originViewId、originParent、task、states（StateStore）。
	 *
	 * @throws 如果是 root（home 不能拖拽）
	 */
	// drag
	public startDrag() {
		if (!this.host.parentController) {
			throw new Error("home不能拖拽!")
		}

		const data: DraggingTaskData = {
			originPanelId: this.host.panel.id,
			originViewId: this.host.viewId,
			originParent: this.host.parentController.task,
			task: this.host.task,
			states: this.host.statesTree,
		}
		this.drag.set(data);
		this.$isMeDragging = true;
		eventbus.emit('drag:start', data);
	}

	/**
	 * 结束拖拽 — 广播 `drag:end` 事件并清除 DragService 数据。
	 */
	public endDrag() {
		eventbus.emit('drag:end', {
			originPanelId: this.host.panel.id,
			originViewId: this.host.viewId,
			task: this.host.task,
		})
		this.$isMeDragging = false;
		this.drag.clear();
	}

	/**
	 * 执行放置 — 将拖拽中的任务 reparenting 到当前控制器。
	 *
	 * 根据 `shouldMove` 判断结果：
	 * - `none` → 拒绝
	 * - `copy` → TODO（暂未实现）
	 * - `link` → 环检测通过后仅 `attachChild`（保留原 parent，双向关联）
	 * - `move` → 同 list 内调换位置（`children.move`）；跨 list 先 `attachChild` + `receiveChild` 再 `detachChild`
	 *
	 * @param metaKeyPressed 是否按下了 Meta 键（⌘）
	 * @param targetIndex 插入位置索引（可选，默认末尾）
	 */
	// drop
	public dropIntoMe(metaKeyPressed: boolean, targetIndex?: number) {
		const data = this.drag.data;
		if (!data) {
			throw new Error("dragging数据为空");
		}

		if (targetIndex === undefined) {
			targetIndex = this.host.task.children.size - 1;
		}

		switch (this.shouldMove(metaKeyPressed, targetIndex)) {
			case 'none':
				return;
			case 'copy':
				// TODO: 先不支持
				console.log('copy')
				return;
			case 'link':
				console.log('link')
				if (this.willCreateCycle(data.task)) {
					alert('会成环!')
					return;
				}
				this.host.task.attachChild(data.task, targetIndex);
				return;
			case "move":
				console.log('move')
				// 如果是在同一个list中, 仅调换位置, 就直接move
				if ((this.host.task.id === data.originParent.id) && data.originPanelId === this.host.panel.id) {
					console.log("move into same list");
					console.log({
						originParentId: data.originParent.id,
						originTaskId: data.task.id,
						targetIndex,
					});

					const currentIndex = this.host.childrenActions.getChildIndex(data.task.id)
					if (currentIndex === targetIndex) {
						return;
					} else if (currentIndex < targetIndex) {
						targetIndex--;
					}

					return this.host.task.children.move(data.task.id, targetIndex); // FIXME:targetIndex其实是有问题的
				}

				if (this.willCreateCycle(data.task)) {
					alert('会成环!')
					return;
				}

				// 先attach再detach
				// 1. attach
				this.host.task.attachChild(data.task, targetIndex);
				this.host.statesTree.receiveChild(data.states);
				// 2. detach from origin
				data.originParent.deleteChild(data.task);
				return;
		}
	}

	/**
	 * 拖拽悬停在当前控制器上 — 返回 dropEffect 控制鼠标样式和指示条显示。
	 *
	 * @param metaKeyPressed 是否按下了 Meta 键（⌘）
	 * @param targetIndex 插入位置索引（可选）
	 * @returns DataTransfer.dropEffect（'none' | 'move' | 'link' | 'copy'）
	 */
	public dragOverMe(metaKeyPressed: boolean, targetIndex?: number): DataTransfer["dropEffect"] {
		if (targetIndex === undefined) {
			targetIndex = this.host.task.children.size - 1;
		}

		const result = this.shouldMove(metaKeyPressed, targetIndex);
		return result;
	}

	/**
	 * 环检测 — 判断将指定任务作为当前任务的子任务是否会形成循环引用。
	 *
	 * @param task 待添加的子任务
	 * @returns `true` 如果会成环
	 */
	private willCreateCycle(task: Task) {
		return willCreateCycle(this.host.task, task);
	}


	// ondragover
	// 1. 判断当前复制还是移动(设置鼠标)
	// 2. 控制高亮显示 或是 插入位置指示条 (这个可以由Svelte组件来做)
	// 3. 


	/**
	 * 判断拖放操作的类型（move / link / copy / none）。
	 *
	 * 规则：
	 * 1. 拖到自己或子孙节点上 → `none`
	 * 2. 同 parent 同位置 → `none`
	 * 3. 同 parent 不同位置 → `move`（仅调换位置）
	 * 4. 同 panel + 无 metaKey → `move`
	 * 5. 同 panel + metaKey → `link`
	 * 6. 跨 panel + 无 metaKey → `link`
	 * 7. 跨 panel + metaKey → `move`
	 *
	 * @param metaKeyPressed 是否按下了 Meta 键（⌘）
	 * @param targetIndex 插入位置索引
	 * @returns DataTransfer.dropEffect
	 */
	private shouldMove(metaKeyPressed: boolean, targetIndex: number): DataTransfer["dropEffect"] {
		const data = this.drag.data;
		if (!data) {
			console.warn("dragging数据为空")
			return 'none';
		}

		// 不让放到自己或者自己的子节点上
		let currentTodo: TodoController | undefined = this.host;
		while (currentTodo) {
			if (currentTodo.task.id == data.task.id) {
				return 'none';
			}
			currentTodo = currentTodo.parentController;
		}

		if (data.originParent.id === this.host.task.id) {
			// 1. 如果是同一个的同一个位置(插入之后没动弹) 就不行
			const index = this.host.childrenActions.getChildIndex(data.task.id);

			if (index === targetIndex || index + 1 === targetIndex) {
				return 'none';
			}

			// 2. 如果是同一个parentTaskId, 那就只是换位置
			// 如果是在同一个list中, 仅调换位置, 就直接move
			if (this.host.task.id === data.originParent.id) {
				return 'move';
			}
		}

		// 同panel内move, 不同panel内link
		const samePanel = this.host.panel.id === data.originPanelId;

		if (metaKeyPressed) {
			console.log('metaKeyPressed')
			if (samePanel) {
				return 'link';
			} else {
				return 'move';
			}
		} else {
			if (samePanel) {
				return 'move';
			} else {
				return 'link';
			}
		}
	}
}
