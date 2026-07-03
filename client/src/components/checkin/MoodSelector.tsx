import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Mood } from "../../api/checkins";
import { MOOD_OPTIONS } from "../../constants/checkin";
import { COLORS, FONTS } from "../../theme";
import { checkinStyles } from "./common";

interface Props {
  value: Mood | null;
  onChange: (mood: Mood) => void;
}

/**
 * "Humor predominante" card from the wizard's behavior step: the design's five
 * colored line-style faces with matching captions; the selection gets the soft
 * blue highlight.
 */
export function MoodSelector({ value, onChange }: Props) {
  return (
    <View style={checkinStyles.blockRow}>
      <Text style={checkinStyles.questionLabel}>Humor predominante</Text>
      <View style={styles.moodRow}>
        {MOOD_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            testID={`checkin-mood-${option.value}`}
            accessibilityRole="button"
            accessibilityState={{ selected: value === option.value }}
            style={[
              styles.moodOption,
              value === option.value && styles.moodOptionSelected,
            ]}
            onPress={() => onChange(option.value)}
          >
            <MaterialCommunityIcons
              name={
                option.icon as ComponentProps<
                  typeof MaterialCommunityIcons
                >["name"]
              }
              size={30}
              color={option.color}
            />
            <Text style={[styles.moodLabel, { color: option.color }]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  moodOption: {
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    padding: 6,
    flex: 1,
  },
  moodOptionSelected: {
    backgroundColor: COLORS.chipBg,
  },
  moodLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    textAlign: "center",
  },
});
