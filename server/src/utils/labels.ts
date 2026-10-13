import { EventType } from "@prisma/client";

/**
 * Portuguese labels for the intercorrence event types, used in the text of
 * outgoing notifications. This duplicates client/src/constants/intercorrence.ts
 * on purpose: the two packages share no build, and a push body is composed on
 * the server, where the client's copy is not reachable. Keep the two in sync
 * when the EventType enum gains a value.
 */
const EVENT_TYPE_LABELS: Record<EventType, string> = {
  fall: "Queda",
  choking: "Engasgo",
  fever: "Febre",
  breathing_difficulties: "Falta de ar",
  bleeding: "Sangramento",
  confusion: "Confusão aguda",
  chest_pain: "Dor no peito",
  other: "Outro",
};

/** Returns the Portuguese label for an event type. */
/**
 * Labels for the weekly check-in's acute events, as they read in a risk reason.
 */
const WEEKLY_EVENT_LABELS: Record<string, string> = {
  fever: "Febre",
  breathing_difficulty: "Falta de ar",
  fall_with_injury: "Queda com lesão",
  active_bleeding: "Sangramento",
  acute_confusion: "Confusão aguda",
  pain: "Dor",
  cough: "Tosse",
  fall_without_injury: "Queda sem lesão",
};

export function weeklyEventLabel(event: string): string {
  return WEEKLY_EVENT_LABELS[event] ?? event;
}

export function eventTypeLabel(eventType: EventType): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}
