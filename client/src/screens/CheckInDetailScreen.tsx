import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  deleteCheckIn,
  getCheckIn,
  updateCheckIn,
  type CheckInInput,
} from "../api/checkins";

type Props = NativeStackScreenProps<AppStackParamList, "CheckInDetail">;

const YES_NO_QUESTIONS = [
  { key: "choking", label: "Engasgos ao comer ou beber?" },
  { key: "gaitImpairment", label: "Dificuldade para caminhar?" },
  { key: "violenceSign", label: "Sinais de violência?" },
  { key: "irregularSleep", label: "Sono irregular?" },
  { key: "socialIsolation", label: "Isolamento social?" },
  { key: "failedComms", label: "Dificuldade de comunicação?" },
  { key: "memoryLoss", label: "Perda de memória?" },
] as const;

type BooleanKey = (typeof YES_NO_QUESTIONS)[number]["key"];

const EMPTY_TOGGLES: Record<BooleanKey, boolean> = {
  choking: false,
  gaitImpairment: false,
  violenceSign: false,
  irregularSleep: false,
  socialIsolation: false,
  failedComms: false,
  memoryLoss: false,
};

/**
 * View and edit a single weekly check-in. The route carries the `profileId` and
 * the `checkInId`; the record is loaded, shown in the same form the create
 * screen uses, and can be saved or deleted. The layout is intentionally minimal.
 */
export function CheckInDetailScreen({ navigation, route }: Props) {
  const { profileId, checkInId } = route.params;

  const [falls, setFalls] = useState("");
  const [weightLoss, setWeightLoss] = useState("");
  const [toggles, setToggles] =
    useState<Record<BooleanKey, boolean>>(EMPTY_TOGGLES);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCheckIn(profileId, checkInId)
      .then((checkIn) => {
        if (!active) return;
        setFalls(String(checkIn.falls));
        setWeightLoss(String(checkIn.weightLoss));
        setToggles({
          choking: checkIn.choking,
          gaitImpairment: checkIn.gaitImpairment,
          violenceSign: checkIn.violenceSign,
          irregularSleep: checkIn.irregularSleep,
          socialIsolation: checkIn.socialIsolation,
          failedComms: checkIn.failedComms,
          memoryLoss: checkIn.memoryLoss,
        });
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar o check-in.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileId, checkInId]);

  function setToggle(key: BooleanKey, value: boolean) {
    setToggles((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const input: CheckInInput = {
      falls: Number(falls) || 0,
      weightLoss: Number(weightLoss) || 0,
      ...toggles,
    };

    try {
      await updateCheckIn(profileId, checkInId, input);
      navigation.goBack();
    } catch {
      setError("Não foi possível salvar o check-in.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await deleteCheckIn(profileId, checkInId);
      navigation.goBack();
    } catch {
      setError("Não foi possível excluir o check-in.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ActivityIndicator
        testID="checkin-detail-loading"
        style={styles.loading}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text testID="checkin-detail-title" style={styles.title}>
        Editar check-in
      </Text>

      <Text style={styles.label}>Quantas quedas nesta semana?</Text>
      <TextInput
        testID="checkin-falls"
        style={styles.input}
        placeholder="0"
        keyboardType="numeric"
        value={falls}
        onChangeText={setFalls}
      />

      <Text style={styles.label}>Perda de peso (kg)?</Text>
      <TextInput
        testID="checkin-weightLoss"
        style={styles.input}
        placeholder="0"
        keyboardType="numeric"
        value={weightLoss}
        onChangeText={setWeightLoss}
      />

      {YES_NO_QUESTIONS.map((question) => (
        <View key={question.key} style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{question.label}</Text>
          <Switch
            testID={`checkin-${question.key}`}
            value={toggles[question.key]}
            onValueChange={(value) => setToggle(question.key, value)}
          />
        </View>
      ))}

      {error ? (
        <Text testID="checkin-detail-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        testID="checkin-detail-save"
        title="Salvar"
        onPress={handleSave}
        disabled={saving}
      />

      <View style={styles.deleteButton}>
        <Button
          testID="checkin-delete"
          title="Excluir"
          color="#c0392b"
          onPress={handleDelete}
          disabled={saving}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 8,
  },
  loading: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 16,
    paddingRight: 12,
  },
  error: {
    color: "red",
    textAlign: "center",
  },
  deleteButton: {
    marginTop: 12,
  },
});
