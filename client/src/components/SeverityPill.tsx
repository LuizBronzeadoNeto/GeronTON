import { StatusPill } from "./StatusPill";
import { COLORS } from "../theme";

/**
 * Severity pill for an intercorrence: red "Crítico" for critical events and
 * orange "Atenção" otherwise, as in the Figma history list.
 */
export function SeverityPill({ isCritical }: { isCritical: boolean }) {
  return (
    <StatusPill
      label={isCritical ? "Crítico" : "Atenção"}
      color={isCritical ? COLORS.danger : COLORS.warning}
      backgroundColor={isCritical ? COLORS.dangerBadgeBg : COLORS.warningBg}
    />
  );
}
