import * as Y from "yjs";
import type { TaskProxy } from "$lib/states/meta/task.svelte";
import { EditorPanelState, JournalPanelState, type StateMap } from "$lib/states/states/panel_states";

let editorPanelState: EditorPanelState;
export function loadEditorPanelState(panelId: string, panelStates: Y.Map<StateMap>, rootTask: TaskProxy) {
    if (!editorPanelState) {
        editorPanelState = new EditorPanelState(panelId, [rootTask], panelStates)
    }

    return editorPanelState;
}

let journalPanelState: JournalPanelState;
export function loadJournalPanelState(panelId: string, panelStates: Y.Map<StateMap>) {
    if (!journalPanelState) {
        journalPanelState = new JournalPanelState(panelId, panelStates);
    }

    return journalPanelState
}