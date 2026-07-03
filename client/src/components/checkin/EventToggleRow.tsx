import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme";
import { checkinStyles as styles } from "./common";

interface Props {
  event: { key: string; label: string; critical: boolean };
  selected: boolean;
  onToggle: () => void;
}

/**
 * "Intercorrências na semana" row from the wizard's first step: the event
 * label (with the red "crítico" tag for the clinically critical ones) and a
 * radio-style toggle on the right.
 */
export function EventToggleRow({ event, selected, onToggle }: Props) {
  return (
    <Pressable
      testID={`checkin-event-${event.key}`}
      accessibilityRole="button"
      accessibilityState={{ checked: selected }}
      style={styles.questionRow}
      onPress={onToggle}
    >
      <Text style={styles.questionLabel}>
        {event.label}
        {event.critical ? (
          <Text style={styles.criticalTag}> crítico</Text>
        ) : null}
      </Text>
      <Ionicons
        name={selected ? "radio-button-on" : "ellipse-outline"}
        size={22}
        color={selected ? COLORS.primary : COLORS.grey400}
      />
    </Pressable>
  );
}
