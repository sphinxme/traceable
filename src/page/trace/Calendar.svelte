<script lang="ts">
    // 不要删掉 因为会挂载web component
    import EventTitle from "./calendar/EventTitle.svelte";
    import dayjs from "dayjs";

    import FullCalendar from "$lib/components/fullcalendar/FullCalendar.svelte";
    import timeGridPlugin from "@fullcalendar/timegrid";
    import { Calendar, type CalendarOptions } from "@fullcalendar/core";
    import { ScrollArea } from "$lib/components/ui/scroll-area";
    import interactionPlugin from "@fullcalendar/interaction";
    import type { Database, Event } from "./todo/data";
    import { onMount } from "svelte";
    import log from "loglevel";
    import { TaskEventGroup, diff } from "./calendar/data/data";

    export let db: Database;
    export let rootId = "root";
    let calendar: Calendar;
    let itsMeUpdating = false;

    const defaultAllDayEventDuration = 1000 * 60 * 60 * 24; // 一天 // TODO:抽离到单独的文件
    const defaultTimedEventDuration = 1000 * 60 * 30; // 30分钟

    onMount(() => {
        let yEventsUnobserver: Map<string, () => void> = new Map();

        const onEventDataUpdated = (updated: Event) => {
            console.log("event on yjs-side updated, updated:", updated);
            const eventId = updated.id;
            const fEvent = calendar.getEventById(eventId);
            if (!fEvent) {
                throw new Error(`unadded fEvent, ${eventId}`);
            }
            {
                let datesChanged = false;
                if (fEvent.start?.valueOf() != updated.start) {
                    datesChanged = true;
                }
                if (fEvent.end?.valueOf() != updated.end) {
                    datesChanged = true;
                }
                if (fEvent.allDay != updated.isAllDay) {
                    datesChanged = true;
                }
                if (datesChanged) {
                    fEvent.setDates(updated.start, updated.end, {
                        allDay: updated.isAllDay,
                    });
                }
            }
            {
                if (fEvent.extendedProps.isCompleted !== updated.isCompleted) {
                    fEvent.setExtendedProp("isCompleted", updated.isCompleted);
                }
            }
        };

        const onNewEventArrived = (eventId: string) => {
            const unobserver = db.observeEvent(eventId, onEventDataUpdated);
            yEventsUnobserver.set(eventId, unobserver);
            // 如果已经存在了的话就不要添加了 (事件拖动到fCalendar上面, 导致fCallendar有事件 但本地监听稍后才有)
            const existedEvent = calendar.getEventById(eventId);
            if (existedEvent) {
                return;
            }

            const data = db.getEventData(eventId);
            calendar.addEvent({
                id: data.id,
                allDay: data.isAllDay,
                start: data.start,
                end: data.end,
                extendedProps: {
                    isCompleted: data.isCompleted,
                    taskId: data.taskId,
                },
            });
        };

        const onEventLeaved = (eventId: string) => {
            const fEvent = calendar.getEventById(eventId);
            fEvent?.remove();
            const unobserver = yEventsUnobserver.get(eventId);
            if (!unobserver) {
                throw new Error(`failed getting unobserver`);
            }
            unobserver();
            yEventsUnobserver.delete(eventId);
        };

        const eventGroup: TaskEventGroup = new TaskEventGroup(
            db,
            rootId,
            (updatedEventIds) => {
                const before = [...yEventsUnobserver.keys()];
                const now = updatedEventIds;
                const { added, deleted, changed } = diff(before, now);
                if (!changed) {
                    return;
                }
                added.forEach(onNewEventArrived);
                deleted.forEach(onEventLeaved);
            },
        );
        const interestedEventIds = eventGroup.fetchAllEvents();
        interestedEventIds.forEach(onNewEventArrived);
        return () => {
            eventGroup.destory();
            yEventsUnobserver.forEach((unobserve) => unobserve());
        };
    });

    let option: CalendarOptions = {
        initialView: "timeGridWeek",
        // defaultAllDayEventDuration: "25:00",
        plugins: [timeGridPlugin, interactionPlugin],
        droppable: true,
        editable: true,
        defaultAllDayEventDuration,
        defaultTimedEventDuration,
        headerToolbar: {
            left: "prev,next",
            center: "title",
            right: "timeGridWeek,timeGridDay,dayGridThreeDay",
        },
        views: {
            dayGridThreeDay: {
                type: "timeGrid",
                duration: { days: 5 },
                dateIncrement: { days: 1 },
            },
        },
        nowIndicator: true,
        dateIncrement: {
            days: 1,
        },
        eventContent(renderProps, createElement) {
            const taskId: string = renderProps.event.extendedProps.taskId;
            if (taskId) {
                const el = document.createElement("event-title", {});
                el.setAttribute("taskId", taskId);
                el.setAttribute("eventId", renderProps.event.id);
                // el.addEventListener("custom", (event) => {
                //     // log.info(event)
                // });
                return { domNodes: [el] };
            }
            return "";
        },
        eventAdd(arg) {
            console.log("event add");
            log.warn("eventAdd", arg);
        },
        eventResize(arg) {
            itsMeUpdating = true;
        },
        eventDrop(arg) {
            itsMeUpdating = true;
        },
        eventChange(arg) {
            // 把用户在我这里触发的更改传送给远端yjs
            if (!itsMeUpdating) {
                return;
            }
            itsMeUpdating = false;

            console.log("on fCalendar side event updated, ", arg);

            const fEvent = arg.event;
            const event = db.getEventData(fEvent.id);

            let changed = false;
            // diff
            if (event.start != fEvent.start?.valueOf()) {
                changed = true;
            }
            if (event.end != fEvent.end?.valueOf()) {
                changed = true;
            }
            if (event.isAllDay != fEvent.allDay) {
                changed = true;
            }
            if (!changed) {
                console.error("unchanged events!!!");
                return;
            }
            const yEvent = db.events.get(fEvent.id);
            if (!yEvent) {
                throw new Error(`failed getting event, id:${fEvent.id}`);
            }
            db.doc.transact((transaction) => {
                transaction.meta.set("traceable::source", "fullCalendar");
                if (event.start != fEvent.start?.valueOf()) {
                    if (!fEvent.start) {
                        throw new Error(
                            `invalid fEvent.start, fEvent.start:${fEvent.end}, id:${fEvent.id}`,
                        );
                    }
                    yEvent.set("start", fEvent.start.valueOf());
                }
                if (event.end != fEvent.end?.valueOf()) {
                    let end = fEvent.end;
                    if (!end) {
                        end = dayjs(event.start).add(1, "day").toDate();
                    }
                    yEvent.set("end", end.valueOf());
                }
                if (event.isAllDay !== fEvent.allDay) {
                    console.log("fEvent.allDay", fEvent.allDay);
                    yEvent.set("isAllDay", fEvent.allDay);
                }
            });
        },
        eventReceive(arg) {
            console.log("received", arg);
            const fEvent = arg.event;
            const taskId = fEvent.extendedProps.taskId;
            const start = fEvent.start!.valueOf();
            let end: number = 0;
            if (fEvent.allDay) {
                const defaultDuration = calendar.getOption(
                    "defaultAllDayEventDuration",
                ) as number;
                end = start + defaultDuration;
            } else {
                const defaultDuration = calendar.getOption(
                    "defaultTimedEventDuration",
                ) as number;
                end = start + defaultDuration;
            }

            db.createEvent(
                {
                    id: fEvent.id,
                    taskId: taskId,
                    start,
                    end,
                    isAllDay: fEvent.allDay,
                    isCompleted: false,
                },
                "fullCalendar",
            );
        },
        eventClassNames(renderProps) {
            const id = renderProps.event.id;
            const event = db.events.get(id);
            // const event = db.getEventData(id);
            if (!event) {
                return [];
            }
            if (event.get("isCompleted")) {
                return ["isCompleted"];
            }
            return [];
        },
    };
</script>

<div
    class="h-full p-4 flex bg-white rounded shadow-xl"
    style="overflow: hidden;"
>
    <ScrollArea
        class="h-full w-full flex whitespace-nowrap rounded-md border"
        orientation="horizontal"
    >
        <FullCalendar bind:calendar class="" options={option} />
    </ScrollArea>
</div>

<style>
    :global(.isCompleted) {
        opacity: 0.5;
    }
</style>
