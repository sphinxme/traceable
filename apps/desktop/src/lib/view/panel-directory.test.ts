import { describe, expect, it } from "vitest";
import { PanelDirectory } from "$lib/view/panel-directory";
import { makeViewFixture } from "@/tests/fixtures/view";

function panelWithId(panelId: string) {
  return makeViewFixture(panelId).panel;
}

describe("PanelDirectory", () => {
  it("register / get / all / unregister", () => {
    const directory = new PanelDirectory();
    const panel = panelWithId("root");

    directory.register(panel);
    expect(directory.get("root")).toBe(panel);
    expect(directory.all()).toEqual([panel]);

    directory.unregister("root");
    expect(directory.get("root")).toBeUndefined();
    expect(directory.all()).toEqual([]);
  });

  it("同 panelId 重复注册 = dev throw（G9）", () => {
    const directory = new PanelDirectory();
    directory.register(panelWithId("root"));

    expect(() => directory.register(panelWithId("root"))).toThrow(
      /duplicate panel/,
    );
  });

  it("注销不存在的 id 为 no-op", () => {
    const directory = new PanelDirectory();
    expect(() => directory.unregister("missing")).not.toThrow();
  });
});
