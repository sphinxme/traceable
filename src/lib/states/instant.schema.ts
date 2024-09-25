// traceable
// https://instantdb.com/dash?s=main&t=home&app=d4aebd74-52c3-46b0-9915-ae3cf77300da

import { i } from "@instantdb/core";

export const INSTANT_APP_ID = "d4aebd74-52c3-46b0-9915-ae3cf77300da";

const graph = i.graph(
  INSTANT_APP_ID,
  {
    tasks: i.entity({
      textId: i.string().unique(),
      noteId: i.string().unique(),
      isCompleted: i.boolean(),
    }),
    taskChildEdges: i.entity({
      seq: i.number(),
    }),
    journalTasks: i.entity({
      time: i.number(),
      type: i.string(),
    }),
    events: i.entity({
      start: i.number(),
      end: i.number(),
      isAllDay: i.boolean(),
      isCompleted: i.boolean(),
    }),
  },
  {
    journalTask: {
      forward: {
        on: "journalTasks",
        has: "one",
        label: "task",
      },
      reverse: {
        on: "tasks",
        has: "one",
        label: "journal",
      },
    },
    journalNext: {
      forward: {
        on: "journalTasks",
        has: "one",
        label: "next",
      },
      reverse: {
        on: "journalTasks",
        has: "one",
        label: "prev",
      },
    },
    taskParentEdge: {
      forward: {
        on: "tasks",
        has: "many",
        label: "childList",
      },
      reverse: {
        on: "taskChildEdges",
        has: "one",
        label: "parent",
      },
    },
    taskChildEdge: {
      reverse: {
        on: "taskChildEdges",
        has: "one",
        label: "task",
      },
      forward: {
        on: "tasks",
        has: "many",
        label: "parentList",
      },
    },
    taskEvents: {
      forward: {
        on: "tasks",
        has: "many",
        label: "events",
      },
      reverse: {
        on: "events",
        has: "one",
        label: "task",
      },
    },
  },
);

export default graph;
