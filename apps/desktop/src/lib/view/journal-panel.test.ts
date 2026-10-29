import { describe, expect, it, vi } from "vitest";
import type { Journal } from "$lib/document/entities/journal.svelte";
import { FocusService } from "$lib/interaction/focus-service";
import { REVEAL_HIGHLIGHT_MS } from "$lib/protocol";
import { devWarn } from "$lib/utils";
import { JournalPanel } from "$lib/view/panel.svelte";
import { PanelDirectory } from "$lib/view/panel-directory";
import { ViewHandle } from "$lib/view/view-handle.svelte";
import { addTask, ref } from "@/tests/fixtures/document";
import { makeViewFixture } from "@/tests/fixtures/view";

vi.mock("$lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/utils")>();
  return { ...actual, devWarn: vi.fn() };
});

function setup() {
  const fixture = makeViewFixture("journal");
  const directory = new PanelDirectory();
  const focus = new FocusService(directory);
  const journals: Journal[] = [];
  const panel = new JournalPanel(
    "journal",
    fixture.store,
    fixture.panelState,
    focus,
    () => journals,
  );
  directory.register(panel);
  return { ...fixture, panel, journals };
}

function addJournal(
  fixture: ReturnType<typeof setup>,
  key: string,
  text: string,
): Journal {
  const journal = fixture.store.getOrCreateJournal(key, 0, "WEEK", text);
  fixture.journals.push(journal);
  return journal;
}

describe("JournalPanel homes", () => {
  it("按时间窗返回存活 home", () => {
    const fixture = setup();
    const week1 = addJournal(fixture, "w1", "W1");
    const week2 = addJournal(fixture, "w2", "W2");

    expect(fixture.panel.homes().map((t) => t.id)).toEqual([
      week1.taskId,
      week2.taskId,
    ]);
  });

  it("journal.task 缺失 → 防御跳过 + devWarn", () => {
    const fixture = setup();
    const week1 = addJournal(fixture, "w1", "W1");
    const week2 = addJournal(fixture, "w2", "W2");
    fixture.store.deleteEntity(week2.taskId);
    vi.mocked(devWarn).mockClear();

    expect(fixture.panel.homes().map((t) => t.id)).toEqual([week1.taskId]);
    expect(vi.mocked(devWarn)).toHaveBeenCalledWith(
      "journal.task missing",
      week2.id,
    );
  });
});

describe("JournalPanel findOccurrencePaths（两方言合一）", () => {
  it("产出挂载地址（home = journal task）", () => {
    const fixture = setup();
    const week = addJournal(fixture, "w1", "W1");
    const home = fixture.store.getTask(week.taskId)!;
    const a = addTask(fixture.store, home, "A", "a");
    const t = addTask(fixture.store, a, "T", "t");

    expect(fixture.panel.findOccurrencePaths(t.id)).toEqual([
      { panelId: "journal", homeId: home.id, path: ["a", "t"] },
    ]);
  });

  it("同任务跨周多出现 → 多个 home 的 ref", () => {
    const fixture = setup();
    const week1 = addJournal(fixture, "w1", "W1");
    const week2 = addJournal(fixture, "w2", "W2");
    const home1 = fixture.store.getTask(week1.taskId)!;
    const home2 = fixture.store.getTask(week2.taskId)!;
    const shared = addTask(fixture.store, home1, "S", "s");
    home2.attachChild(shared);

    const refs = fixture.panel.findOccurrencePaths(shared.id);
    expect(refs).toEqual([
      { panelId: "journal", homeId: home1.id, path: ["s"] },
      { panelId: "journal", homeId: home2.id, path: ["s"] },
    ]);
  });
});

describe("JournalPanel reveal（恒等归一化）", () => {
  it("resolve 已挂载出现并应用 scroll/highlight", async () => {
    const fixture = setup();
    const week = addJournal(fixture, "w1", "W1");
    const home = fixture.store.getTask(week.taskId)!;
    const a = addTask(fixture.store, home, "A", "a");

    const homeHandle = new ViewHandle(fixture.panel, home);
    fixture.panel.registry.register(homeHandle);
    const aHandle = new ViewHandle(fixture.panel, a, homeHandle);
    fixture.panel.registry.register(aHandle);
    const scroll = vi.fn();
    aHandle.scrollIntoView = scroll;

    const before = Date.now();
    const handle = await fixture.panel.reveal(ref("journal", home.id, ["a"]), {
      scroll: true,
      highlight: true,
    });

    expect(handle).toBe(aHandle);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(aHandle.highlightUntil).toBeGreaterThanOrEqual(
      before + REVEAL_HIGHLIGHT_MS,
    );
  });

  it("目标不可达 → undefined（resolve miss）", async () => {
    const fixture = setup();
    const week = addJournal(fixture, "w1", "W1");
    const home = fixture.store.getTask(week.taskId)!;

    const handle = await fixture.panel.reveal(ref("journal", home.id, ["a"]));
    expect(handle).toBeUndefined();
  });
});
