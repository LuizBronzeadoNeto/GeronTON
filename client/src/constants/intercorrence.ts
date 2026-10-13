import type { EventType, Intercorrence } from "../api/intercorrences";

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
  { value: "chest_pain", label: "Dor no peito" },
  { value: "other", label: "Outro" },
];

/**
 * Event types that are critical whatever severity was picked. Mirrors
 * CRITICAL_EVENT_TYPES in server/src/utils/risk.ts; keep the two in sync.
 */
const CRITICAL_EVENT_TYPES: ReadonlySet<EventType> = new Set([
  "fever",
  "breathing_difficulties",
  "bleeding",
  "confusion",
  "chest_pain",
  "choking",
]);

/**
 * Whether an intercorrence is critical: flagged so, or of a critical type.
 */
export function isCriticalEvent(
  event: Pick<Intercorrence, "eventType" | "isCritical">,
): boolean {
  return event.isCritical || CRITICAL_EVENT_TYPES.has(event.eventType);
}

/**
 * Returns the display label for an event type.
 */
export function eventTypeLabel(eventType: EventType): string {
  return (
    EVENT_TYPE_OPTIONS.find((option) => option.value === eventType)?.label ??
    eventType
  );
}
