import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../theme";

interface Props {
  phone: string | null;
  notes: string | null;
}

/** "(83) 99999-1234" or "(83) 3222-1100" from the stored digits. */
function formatPhone(digits: string): string {
  const number = digits.slice(2);
  const split = number.length - 4;
  return `(${digits.slice(0, 2)}) ${number.slice(0, split)}-${number.slice(split)}`;
}

/**
 * The family's contact on the elder's screen: tap to call or open WhatsApp,
 * which is how the care team actually reaches families, plus the notes the
 * caregiver wrote about the elder.
 */
export function FamilyContactCard({ phone, notes }: Props) {
  return (
    <View testID="family-contact" style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        Contato da família
      </Text>
      {phone ? (
        <>
          <Text style={styles.phone}>{formatPhone(phone)}</Text>
          <View style={styles.actions}>
            <Pressable
              testID="family-call"
              accessibilityRole="button"
              accessibilityLabel={`Ligar para ${formatPhone(phone)}`}
              style={styles.action}
              onPress={() => void Linking.openURL(`tel:+55${phone}`)}
            >
              <Ionicons name="call-outline" size={16} color={COLORS.white} />
              <Text style={styles.actionLabel}>Ligar</Text>
            </Pressable>
            <Pressable
              testID="family-whatsapp"
              accessibilityRole="button"
              accessibilityLabel={`Abrir WhatsApp com ${formatPhone(phone)}`}
              style={[styles.action, styles.whatsapp]}
              onPress={() => void Linking.openURL(`https://wa.me/55${phone}`)}
            >
              <Ionicons name="logo-whatsapp" size={16} color={COLORS.white} />
              <Text style={styles.actionLabel}>WhatsApp</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text style={styles.body}>
          Nenhum telefone cadastrado. Edite o idoso para adicionar o telefone da
          família.
        </Text>
      )}
      {notes ? (
        <>
          <Text style={styles.notesTitle}>Observações</Text>
          <Text style={styles.body}>{notes}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.heading,
  },
  phone: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
  },
  whatsapp: {
    backgroundColor: COLORS.green,
  },
  actionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
  notesTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text,
  },
});
