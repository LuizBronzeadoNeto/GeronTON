import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Alert, AlertSeverity, AlertType } from "../api/alerts";
import { StatusPill } from "./StatusPill";
import { formatTimestamp } from "../utils/date";
import { COLORS, FONTS } from "../theme";

interface Props {
  alert: Alert;
  testID?: string;
  subtitle?: string;
  onPress?: () => void;
  onResolve?: (signalConfirmed: boolean, note: string) => void;
}

const SEVERITIES: Record<
  AlertSeverity,
  { label: string; color: string; bg: string }
> = {
  attention: { label: "Atenção", color: COLORS.warning, bg: COLORS.warningBg },
  critical: {
    label: "Crítico",
    color: COLORS.danger,
    bg: COLORS.dangerBadgeBg,
  },
};

/**
 * Icon per alert type, so the professional reads the alert's nature at a
 * glance: the house marks a weakened home bond (missing weekly reports), the
 * others mark the vital-sign warnings derived from a check-in.
 */
const TYPE_ICONS: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  weakened_home_bond: "home-outline",
  clinical_warning: "pulse-outline",
  metabolic_decompensation: "water-outline",
  sarcopenia_risk: "body-outline",
};

/**
 * Card for a clinical alert (weakened home bond, vital-sign warnings): a
 * type icon, the severity pill, the message, an optional subtitle (the elderly
 * person's name on the professional dashboard) and the creation timestamp.
 * onPress makes the card tappable (to open the elder's hub, for instance) and
 * onResolve adds the "Contato feito" action shown to healthcare professionals.
 *
 * Marking the contact as done asks whether the signal turned out to be real
 * before calling onResolve, since that answer feeds the false positive count,
 * and offers an optional note on how the contact went.
 */
export function AlertCard({
  alert,
  testID,
  subtitle,
  onPress,
  onResolve,
}: Props) {
  const severity = SEVERITIES[alert.severity];
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");

  function answer(signalConfirmed: boolean) {
    setAsking(false);
    onResolve?.(signalConfirmed, note.trim());
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? "button" : undefined}
      style={[styles.card, { backgroundColor: severity.bg }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View testID={`alert-icon-${alert.type}`} style={styles.iconBadge}>
        <Ionicons
          name={TYPE_ICONS[alert.type]}
          size={18}
          color={severity.color}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <StatusPill
            label={severity.label}
            color={severity.color}
            backgroundColor={COLORS.white}
          />
          {onResolve && !asking ? (
            <Pressable
              testID={testID ? `${testID}-resolve` : undefined}
              accessibilityRole="button"
              accessibilityLabel="Marcar contato como feito"
              style={styles.resolveButton}
              onPress={() => setAsking(true)}
            >
              <Text style={styles.resolveLabel}>Contato feito</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.message}>{alert.message}</Text>
        {asking ? (
          <View
            testID={testID ? `${testID}-verdict` : undefined}
            style={styles.verdict}
          >
            <TextInput
              testID={testID ? `${testID}-note` : undefined}
              style={styles.noteInput}
              placeholder="Como foi o contato? Ex.: liguei, ninguém atendeu"
              placeholderTextColor={COLORS.grey400}
              accessibilityLabel="Observação sobre o contato (opcional)"
              value={note}
              onChangeText={setNote}
              maxLength={500}
              multiline
            />
            <Text style={styles.verdictQuestion}>
              Depois do contato, o sinal procedia?
            </Text>
            <View style={styles.verdictButtons}>
              <Pressable
                testID={testID ? `${testID}-verdict-yes` : undefined}
                accessibilityRole="button"
                style={styles.resolveButton}
                onPress={() => answer(true)}
              >
                <Text style={styles.resolveLabel}>Sim, procedia</Text>
              </Pressable>
              <Pressable
                testID={testID ? `${testID}-verdict-no` : undefined}
                accessibilityRole="button"
                style={styles.resolveButton}
                onPress={() => answer(false)}
              >
                <Text style={styles.resolveLabel}>Não procedia</Text>
              </Pressable>
              <Pressable
                testID={testID ? `${testID}-verdict-cancel` : undefined}
                accessibilityRole="button"
                style={styles.cancelButton}
                onPress={() => setAsking(false)}
              >
                <Text style={styles.cancelLabel}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.date}>{formatTimestamp(alert.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  message: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  subtitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.grey500,
  },
  date: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.grey500,
  },
  resolveButton: {
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  resolveLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.heading,
  },
  verdict: {
    gap: 6,
  },
  noteInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    padding: 10,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
    textAlignVertical: "top",
  },
  verdictQuestion: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.heading,
  },
  verdictButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cancelButton: {
    height: 28,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  cancelLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.grey500,
  },
});
