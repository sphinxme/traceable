import { Duration, EventApi } from "@fullcalendar/core";

export type DraggableEvent = Partial<EventApi> & {
  create?: boolean;
  duration?: string | Duration;
  startTime?: string | Duration;
};
