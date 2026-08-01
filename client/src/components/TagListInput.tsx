import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../theme";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  /** Offered as tappable chips. Tapping one adds or removes it. */
  suggestions?: string[];
  placeholder?: string;
  /** Builds the testIDs: -input, -add, -remove-<item>, and -<item> per suggestion. */
  testIDPrefix: string;
  addAccessibilityLabel?: string;
}

/**
 * A list of short text items the user builds one at a time: type and confirm,
 * or tap a suggestion. Items already chosen show as chips that remove on press.
 *
 * The draft text is held here rather than by the caller, who only ever deals in
 * the finished list.
 */
export function TagListInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  testIDPrefix,
  addAccessibilityLabel = "Adicionar item",
}: Props) {
  const [draft, setDraft] = useState("");

  function toggle(item: string) {
    onChange(
      value.includes(item)
        ? value.filter((current) => current !== item)
        : [...value, item],
    );
  }

  function addDraft() {
    const item = draft.trim();
    if (item === "" || value.includes(item)) {
      return;
    }
    onChange([...value, item]);
    setDraft("");
  }

  /**
   * Anything the user typed. Chosen suggestions stay in their own row, so they
   * are not repeated here.
   */
  const typed = value.filter((item) => !suggestions.includes(item));

  return (
    <>
      {suggestions.length > 0 || typed.length > 0 ? (
        <View style={styles.chipGrid}>
          {suggestions.map((item) => {
            const selected = value.includes(item);
            return (
              <Pressable
                key={item}
                testID={`${testIDPrefix}-${item}`}
                accessibilityRole="button"
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggle(item)}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    selected && styles.chipLabelSelected,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
          {typed.map((item) => (
            <Pressable
              key={item}
              testID={`${testIDPrefix}-remove-${item}`}
              accessibilityRole="button"
              accessibilityLabel={`Remover ${item}`}
              style={[styles.chip, styles.chipSelected]}
              onPress={() => toggle(item)}
            >
              <Text style={[styles.chipLabel, styles.chipLabelSelected]}>
                {item} <Text style={styles.chipRemove}>×</Text>
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.row}>
        <TextInput
          testID={`${testIDPrefix}-input`}
          style={[styles.input, styles.rowInput]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.grey400}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addDraft}
        />
        <Pressable
          testID={`${testIDPrefix}-add`}
          accessibilityRole="button"
          accessibilityLabel={addAccessibilityLabel}
          style={styles.addButton}
          onPress={addDraft}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.heading,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.chipBg,
  },
  chipLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  chipLabelSelected: {
    color: COLORS.primary,
  },
  chipRemove: {
    fontSize: 13,
    color: COLORS.grey500,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  rowInput: {
    flex: 1,
  },
  addButton: {
    width: 60,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
