import { describe, expect, it, vi } from "vitest";
import { FocusService } from "$lib/interaction/focus-service";
import type { OccurrenceRef } from "$lib/protocol";
import { devWarn } from "$lib/utils";
import { PanelDirectory } from "$lib/view/panel-directory";
import type { ViewHandle } from "$lib/view/view-handle.svelte";
import { makeViewFixture } from "@/tests/fixtures/view";

vi.mock("$lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/utils")>();
  return { ...actual, devWarn: vi.fn() };
});

function ref(panelId = "panel", path: string[] = ["a"]): OccurrenceRef {
  return { panelId, homeId: "root", path };
}

function setup() {
  const fixture = makeViewFixture();
  const directory = new PanelDirectory();
  const focus = new FocusService(directory);
  return { ...fixture, directory, focus };
}

describe("FocusService", () => {
  it("面板未挂载：no-op + devWarn", () => {
    const { focus } = setup();
    vi.mocked(devWarn).mockClear();

    expect(() => focus.requestFocus({ ref: ref(), cursor: 0 })).not.toThrow();
    expect(vi.mocked(devWarn)).toHaveBeenCalledWith(
      "focus miss (panel not mounted)",
      expect.anything(),
    );
  });

  it("resolve miss：no-op + devWarn", () => {
    const { focus, directory, panel } = setup();
    directory.register(panel);
    vi.spyOn(panel.registry, "resolve").mockReturnValue(undefined);
    vi.mocked(devWarn).mockClear();

    focus.requestFocus({ ref: ref(), cursor: 0 });
    expect(vi.mocked(devWarn)).toHaveBeenCalledWith(
      "focus miss (strict resolve)",
      expect.anything(),
    );
  });

  it("命中：cursor 透传给 focusEditor 接线", () => {
    const { focus, directory, panel } = setup();
    directory.register(panel);
    const focusEditor = vi.fn<(cursor: number) => boolean>(() => true);
    vi.spyOn(panel.registry, "resolve").mockReturnValue({
      focusEditor,
    } as unknown as ViewHandle);
    vi.mocked(devWarn).mockClear();

    const req = ref("panel", ["a", "a1"]);
    focus.requestFocus({ ref: req, cursor: -3 });

    expect(focusEditor).toHaveBeenCalledWith(-3);
    expect(vi.mocked(devWarn)).not.toHaveBeenCalled();
  });

  it("focusEditor 拒绝：devWarn（不重试、不抛错）", () => {
    const { focus, directory, panel } = setup();
    directory.register(panel);
    vi.spyOn(panel.registry, "resolve").mockReturnValue({
      focusEditor: () => false,
    } as unknown as ViewHandle);
    vi.mocked(devWarn).mockClear();

    focus.requestFocus({ ref: ref(), cursor: 0 });
    expect(vi.mocked(devWarn)).toHaveBeenCalledWith(
      "focusEditor refused",
      expect.anything(),
    );
  });
});
