import * as Y from "yjs";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { Store } from "$lib/document/entities/store.svelte";
import type { Task } from "$lib/document/entities/task.svelte";
import Smoke from "./fixtures/Smoke.svelte";

let instance: ReturnType<typeof mount> | undefined;
let target: HTMLDivElement | undefined;

function render(props: { label: string; task?: Task }) {
  target = document.createElement("div");
  document.body.append(target);
  instance = mount(Smoke, { target, props });
  return target;
}

afterEach(() => {
  if (instance) {
    unmount(instance);
    instance = undefined;
  }
  target?.remove();
  target = undefined;
});

describe("browser 测试环境", () => {
  it("可真实挂载 Svelte 组件", () => {
    const container = render({ label: "browser-ready" });
    expect(container.textContent).toContain("browser-ready");
  });

  it("Yjs 变更经 createSubscriber 驱动组件更新", () => {
    const store = new Store(new Y.Doc());
    const task = store.createTask("before");
    const container = render({ label: "reactive", task });

    expect(container.textContent).toContain("before");

    flushSync(() => {
      store.doc.transact(() => task.text.insert(0, "after "));
    });

    expect(container.textContent).toContain("after before");
  });

  it("运行环境提供 View Transition API", () => {
    expect(typeof document.startViewTransition).toBe("function");
  });
});
