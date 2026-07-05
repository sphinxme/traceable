import type { Task } from "$lib/states/meta/task.svelte";
import { eventbus } from "./eventbus.svelte";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";
import { willCreateCycle } from "$lib/components/graph/graph";
import type { DraggingTaskData } from "$lib/interaction/services/DragService.svelte";

export class DragDropActions implements TodoLifeCycle {

	public $isMeDragging = $state(false);

	public constructor(
		public readonly host: TodoController,
	) { }

	// lifecycle
	public onTodoReady() { }
	public destroy() { }

	private get drag() {
		return this.host.panel.interaction.drag;
	}

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

	public endDrag() {
		eventbus.emit('drag:end', {
			originPanelId: this.host.panel.id,
			originViewId: this.host.viewId,
			task: this.host.task,
		})
		this.$isMeDragging = false;
		this.drag.clear();
	}

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

	public dragOverMe(metaKeyPressed: boolean, targetIndex?: number): DataTransfer["dropEffect"] {
		if (targetIndex === undefined) {
			targetIndex = this.host.task.children.size - 1;
		}

		const result = this.shouldMove(metaKeyPressed, targetIndex);
		return result;
	}

	private willCreateCycle(task: Task) {
		return willCreateCycle(this.host.task, task);
	}


	// ondragover
	// 1. 判断当前复制还是移动(设置鼠标)
	// 2. 控制高亮显示 或是 插入位置指示条 (这个可以由Svelte组件来做)
	// 3. 


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
