import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "./PrimaryButton";
import { useNotification } from "../context/NotificationContext";
import { readEndpoint } from "../api/pushStorage";
import { getPermission, getSupport, requestAndRegister } from "../push";
import type { PushPermission, PushSupport } from "../push/types";
import { COLORS, FONTS } from "../theme";

/**
 * Offers to turn on push notifications, and gets out of the way once there is
 * nothing to offer.
 *
 * It renders null in the two most common states — the platform cannot do push,
 * or the device is already registered — which is what keeps it from nagging
 * without needing a dismissal flag to persist anywhere. That is also why this
 * is a card on the home screens rather than a settings screen: there is nothing
 * to come back and change, only a one-time decision the operating system then
 * owns.
 *
 * The iPhone case is the reason the "needs-install" state exists. Safari
 * exposes the push API only inside a web app added to the Home Screen, so in a
 * normal tab there is no button worth showing — just the instruction that
 * unlocks it.
 */
export function EnableNotificationsCard() {
  const { notify } = useNotification();
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      const currentSupport = getSupport();
      const [currentPermission, endpoint] = await Promise.all([
        getPermission(),
        readEndpoint(),
      ]);

      if (!active) {
        return;
      }

      setSupport(currentSupport);
      setPermission(currentPermission);
      setRegistered(endpoint !== null);
    })();

    return () => {
      active = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setFailed(false);

    try {
      const registration = await requestAndRegister();
      const nextPermission = await getPermission();
      setPermission(nextPermission);

      if (registration) {
        setRegistered(true);
        notify({
          title: "Notificações ativadas",
          message:
            "Você será avisado quando alguém registrar uma intercorrência crítica.",
        });
        return;
      }

      setFailed(nextPermission === "granted");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [notify]);

  if (support === null || support === "unsupported") {
    return null;
  }

  if (support === "needs-install") {
    return (
      <View testID="enable-notifications-install" style={styles.card}>
        <Ionicons
          name="phone-portrait-outline"
          size={20}
          color={COLORS.primary}
        />
        <View style={styles.textPart}>
          <Text style={styles.title}>Avisos no iPhone</Text>
          <Text style={styles.message}>
            Para receber avisos, adicione o GeronTON à Tela de Início: toque em
            Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.
          </Text>
        </View>
      </View>
    );
  }

  if (permission === "denied") {
    return (
      <View testID="enable-notifications-blocked" style={styles.card}>
        <Ionicons
          name="notifications-off-outline"
          size={20}
          color={COLORS.grey500}
        />
        <Text style={styles.message}>
          As notificações estão bloqueadas. Libere nas configurações do
          navegador ou do aparelho.
        </Text>
      </View>
    );
  }

  if (registered) {
    return null;
  }

  return (
    <View testID="enable-notifications-card" style={styles.card}>
      <View style={styles.textPart}>
        <Text style={styles.title}>Ativar notificações</Text>
        <Text style={styles.message}>
          Receba um aviso quando alguém registrar uma intercorrência crítica de
          um idoso que você acompanha.
        </Text>
        {failed ? (
          <Text testID="enable-notifications-error" style={styles.error}>
            Não foi possível ativar as notificações. Tente novamente.
          </Text>
        ) : null}
      </View>
      <PrimaryButton
        testID="enable-notifications"
        title="Ativar"
        size="small"
        loading={busy}
        onPress={() => void enable()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.chipBg,
  },
  textPart: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  message: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.grey500,
  },
  error: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.danger,
  },
});
