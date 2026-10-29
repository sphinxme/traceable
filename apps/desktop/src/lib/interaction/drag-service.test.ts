import { describe, expect, it } from "vitest";
import { DragService } from "$lib/interaction/drag-service.svelte";
import type { DragPayload } from "$lib/protocol";
import type { Task } from "$lib/document/entities/task.svelte";
import type { ViewHandle } from "$lib/view/view-handle.svelte";

function payload(taskId = "t"): DragPayload {
  return {
    task: { id: taskId } as unknown as Task,
    edge: { parentTaskId: "p", childTaskId: taskId },
    from: { panelId: "panel", homeId: "root", path: [taskId] },
    sourceHandle: {} as ViewHandle,
  };
}

describe("DragService 状态机", () => {
  it("begin → dragging；end → idle 并清 payload", () => {
    const ds = new DragService();
    const first = payload("a");

    expect(ds.active).toBe(false);
    expect(ds.payload).toBeUndefined();

    ds.begin(first);
    expect(ds.active).toBe(true);
    expect(ds.payload).toBe(first);

    ds.end();
    expect(ds.active).toBe(false);
    expect(ds.payload).toBeUndefined();
  });

  it("连发 begin：先结算上一会话，payload 为新值", () => {
    const ds = new DragService();
    const first = payload("a");
    const second = payload("b");

    ds.begin(first);
    ds.begin(second);
    expect(ds.active).toBe(true);
    expect(ds.payload).toBe(second);
  });

  it("end 幂等：无 begin 或重复 end 均 no-op", () => {
    const ds = new DragService();
    expect(() => ds.end()).not.toThrow();
    expect(ds.active).toBe(false);

    ds.begin(payload());
    ds.end();
    ds.end();
    expect(ds.active).toBe(false);
    expect(ds.payload).toBeUndefined();
  });
});
