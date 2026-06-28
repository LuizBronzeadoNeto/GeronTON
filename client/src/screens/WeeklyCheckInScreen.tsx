import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Pressable,
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
  createCheckIn,
  listCheckIns,
  type CheckIn,
  type CheckInInput,
} from "../api/checkins";

type Props = NativeStackScreenProps<AppStackParamList, "WeeklyCheckIn">;

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
 * Weekly check-in for an elderly profile. The route carries the `profileId`.
 * The form captures two direct (numeric) questions and seven yes/no questions,
 * submits them, and lists the profile's recent check-in history below. The
 * layout is intentionally minimal — the visual design comes later from Figma.
 */
export function WeeklyCheckInScreen({ navigation, route }: Props) {
  const { profileId } = route.params;

  const [falls, setFalls] = useState("");
  const [weightLoss, setWeightLoss] = useState("");
  const [toggles, setToggles] =
    useState<Record<BooleanKey, boolean>>(EMPTY_TOGGLES);

  const [history, setHistory] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listCheckIns(profileId)
        .then((data) => {
          if (active) setHistory(data);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar o histórico.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [profileId]),
  );

  function setToggle(key: BooleanKey, value: boolean) {
    setToggles((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const input: CheckInInput = {
      falls: Number(falls) || 0,
      weightLoss: Number(weightLoss) || 0,
      ...toggles,
    };

    try {
      await createCheckIn(profileId, input);
      setFalls("");
      setWeightLoss("");
      setToggles(EMPTY_TOGGLES);
      const data = await listCheckIns(profileId);
      setHistory(data);
    } catch {
      setError("Não foi possível salvar o check-in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} testID="checkin">
      <Text testID="checkin-title" style={styles.title}>
        Check-in semanal
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
        <Text testID="checkin-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        testID="checkin-submit"
        title="Salvar check-in"
        onPress={handleSubmit}
        disabled={saving}
      />

      <Text style={styles.subtitle}>Histórico</Text>
      {loading ? <ActivityIndicator testID="checkin-loading" /> : null}
      {!loading && history.length === 0 ? (
        <Text testID="checkin-history-empty" style={styles.empty}>
          Nenhum check-in registrado.
        </Text>
      ) : null}

      <View testID="checkin-history">
        {history.map((item) => (
          <Pressable
            key={item.id}
            testID={`checkin-history-item-${item.id}`}
            style={styles.historyItem}
            onPress={() =>
              navigation.navigate("CheckInDetail", {
                profileId,
                checkInId: item.id,
              })
            }
          >
            <Text style={styles.historyDate}>{item.date.slice(0, 10)}</Text>
            <Text style={styles.historySummary}>
              Quedas: {item.falls} · Perda de peso: {item.weightLoss} kg
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 8,
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
  empty: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  historyDate: {
    fontSize: 16,
    fontWeight: "bold",
  },
  historySummary: {
    fontSize: 14,
    color: "#555",
  },
});
