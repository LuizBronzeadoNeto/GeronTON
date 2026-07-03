import type { EventType } from "../api/intercorrences";

/**
 * Display labels for the intercorrence event types, matching the "/intercorrência"
 * Figma frame's select options. Keys mirror the server's EventType enum.
 */
export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "fall", label: "Queda" },
  { value: "choking", label: "Engasgo" },
  { value: "fever", label: "Febre" },
  { value: "breathing_difficulties", label: "Falta de ar" },
  { value: "bleeding", label: "Sangramento" },
  { value: "confusion", label: "Confusão aguda" },
  { value: "chest_pain", label: "Dor torácica" },
  { value: "other", label: "Outro" },
];

/**
 * Returns the display label for an event type.
 */
export function eventTypeLabel(eventType: EventType): string {
  return (
    EVENT_TYPE_OPTIONS.find((option) => option.value === eventType)?.label ??
    eventType
  );
}
