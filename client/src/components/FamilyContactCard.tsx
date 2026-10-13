import { Linking, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "./PrimaryButton";
import { Section } from "./Section";
import { SPACING, TYPE } from "../theme";

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
    <Section testID="family-contact" title="Contato da família">
      {phone ? (
        <>
          <Text style={styles.phone}>{formatPhone(phone)}</Text>
          <View style={styles.actions}>
            <PrimaryButton
              testID="family-call"
              title="Ligar"
              variant="outline"
              style={styles.action}
              onPress={() => void Linking.openURL(`tel:+55${phone}`)}
            />
            <PrimaryButton
              testID="family-whatsapp"
              title="WhatsApp"
              variant="outline"
              style={styles.action}
              onPress={() => void Linking.openURL(`https://wa.me/55${phone}`)}
            />
          </View>
        </>
      ) : (
        <Text style={styles.body}>
          Nenhum telefone cadastrado. Toque em Editar, em Dados do idoso, para
          adicionar o telefone da família.
        </Text>
      )}
      {notes ? (
        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Observações</Text>
          <Text style={styles.body}>{notes}</Text>
        </View>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  phone: {
    ...TYPE.bodyStrong,
    fontSize: 18,
    lineHeight: 24,
  },
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  action: {
    flex: 1,
  },
  notes: {
    gap: SPACING.xs,
  },
  notesTitle: {
    ...TYPE.label,
  },
  body: {
    ...TYPE.body,
  },
});
