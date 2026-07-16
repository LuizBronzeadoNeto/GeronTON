import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { eventTypeLabel } from "../constants/intercorrence";
import { SeverityPill } from "../components/SeverityPill";
import { PrimaryButton } from "../components/PrimaryButton";
import { formatTimestamp } from "../utils/date";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<
  AppStackParamList,
  "IntercorrenceConfirmation"
>;

/**
 * Confirmation shown right after an intercorrence is registered (the form is
 * replaced by this screen, so back returns to the elder's hub): a success
 * badge, the recorded event's summary (type, severity, timestamp, description)
 * and, for critical events, an urgency notice that the care team is flagged.
 * From here the caregiver returns to the profile or opens the full history.
 */
export function IntercorrenceConfirmationScreen({ navigation, route }: Props) {
  const { profileId, intercorrence } = route.params;

  return (
    <ScrollView
      testID="intercorrence-confirmation"
      contentContainerStyle={styles.container}
    >
      <View style={styles.badge}>
        <Ionicons name="checkmark" size={36} color={COLORS.success} />
      </View>
      <Text style={styles.title}>Intercorrência registrada</Text>
      <Text style={styles.subtitle}>
        O evento foi adicionado ao histórico do idoso.
      </Text>

      {intercorrence.isCritical ? (
        <View testID="confirmation-critical" style={styles.criticalNotice}>
          <Ionicons name="warning-outline" size={18} color={COLORS.danger} />
          <Text style={styles.criticalText}>
            Evento crítico: o nível de risco do idoso foi elevado e a equipe de
            saúde verá o alerta no painel de triagem.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Tipo de evento</Text>
          <Text style={styles.value}>
            {eventTypeLabel(intercorrence.eventType)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Gravidade</Text>
          <SeverityPill isCritical={intercorrence.isCritical} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Data e hora</Text>
          <Text style={styles.value}>
            {formatTimestamp(intercorrence.date)}
          </Text>
        </View>
        {intercorrence.description !== "" ? (
          <View style={styles.descriptionBlock}>
            <Text style={styles.label}>Descrição</Text>
            <Text style={styles.value}>{intercorrence.description}</Text>
          </View>
        ) : null}
      </View>

      <PrimaryButton
        testID="confirmation-back"
        title="Voltar ao perfil"
        onPress={() => navigation.goBack()}
      />
      <Pressable
        testID="confirmation-history"
        accessibilityRole="button"
        style={styles.historyLink}
        onPress={() => navigation.navigate("IntercorrenceList", { profileId })}
      >
        <Text style={styles.historyLinkLabel}>Ver histórico completo</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    backgroundColor: COLORS.white,
    alignItems: "stretch",
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.successBg,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 12,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    color: COLORS.heading,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.grey500,
    textAlign: "center",
  },
  criticalNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(224, 45, 60, 0.2)",
    backgroundColor: COLORS.dangerBg,
    borderRadius: 12,
    padding: 12,
  },
  criticalText: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.danger,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  descriptionBlock: {
    gap: 4,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.grey400,
  },
  value: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
    flexShrink: 1,
    textAlign: "right",
  },
  historyLink: {
    alignSelf: "center",
    padding: 8,
  },
  historyLinkLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
});
