import {
    type ExtractDocumentTypeFromTypedRxJsonSchema,
    toTypedRxJsonSchema,
} from "rxdb";

export const TaskSchema = toTypedRxJsonSchema(
    {
        version: 0,
        primaryKey: "id",
        type: "object",
        properties: {
            id: {
                type: "string",
                maxLength: 64, // <- the primary key must have set maxLength
            },
            textId: {
                type: "string",
            },
            noteId: {
                type: "string",
            },
            isCompleted: {
                type: "boolean",
                default: false,
            },
            updatedAt: {
                type: "number",
                default: 0,
            },
            children: {
                type: "array",
                ref: "tasks",
                items: {
                    type: "string",
                },
            },
        },
        required: ["id", "textId", "noteId", "isCompleted", "children"],
        // indexes: ["children"], // todo: 是否可行
    } as const,
);
export type Task = ExtractDocumentTypeFromTypedRxJsonSchema<
    typeof TaskSchema
>;

export const EventSchema = toTypedRxJsonSchema(
    {
        version: 0,
        primaryKey: "id",
        type: "object",
        properties: {
            id: {
                type: "string",
                maxLength: 64, // <- the primary key must have set maxLength
            },
            start: {
                type: "number",
            },
            end: {
                type: "number",
            },
            isAllDay: {
                type: "boolean",
                default: false,
            },
            task: {
                ref: "tasks",
                type: "string",
                maxLength: 64,
            },
            updatedAt: {
                type: "number",
                default: 0
            },
        },
        required: ["id", "start", "end", "isAllDay", "task"],
        indexes: ["task"],
    } as const,
);
export type Event = ExtractDocumentTypeFromTypedRxJsonSchema<
    typeof EventSchema
>;

export const JournalSchema = toTypedRxJsonSchema(
    {
        version: 0,
        primaryKey: "id",
        type: "object",
        properties: {
            id: {
                type: "string",
                maxLength: 64, // <- the primary key must have set maxLength
            },
            time: {
                type: "number",
            },
            type: {
                type: "string",
            },
            task: {
                ref: "tasks",
                type: "string",
            },
        },
        required: ["id", "time", "type", "task"],
    } as const,
);
export type Journal = ExtractDocumentTypeFromTypedRxJsonSchema<
    typeof JournalSchema
>;

export const UserSchema = toTypedRxJsonSchema(
    {
        version: 0,
        primaryKey: "id",
        type: "object",
        properties: {
            id: {
                type: "string",
                maxLength: 64, // <- the primary key must have set maxLength
            },
            rootTask: {
                ref: "tasks",
                type: "string",
            },
        },
        required: ["id", "rootTask"],
    } as const,
);
export type User = ExtractDocumentTypeFromTypedRxJsonSchema<
    typeof UserSchema
>;
