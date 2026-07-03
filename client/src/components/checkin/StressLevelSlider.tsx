import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FONTS, COLORS } from "../../theme";
import { checkinStyles } from "./common";

interface Props {
  value: number;
  onChange: (level: number) => void;
}

const LEVELS = [0, 1, 2, 3, 4, 5];

const TRACK = "#EDE7F9";
const DOT = "#B9A8E3";
const THUMB = "#5D4FA0";

/**
 * "Nível de estresse predominante" card from the wizard's behavior step: a
 * discrete slider styled after the Figma track — numbers 0–5 above a lilac
 * track with dots, the selection marked by the tall purple thumb. Both tapping
 * a number and dragging across the track select a level; the drag converts the
 * touch's absolute position via measureInWindow, so it stays accurate after
 * scrolling regardless of which child the touch starts on.
 */
export function StressLevelSlider({ value, onChange }: Props) {
  const trackRef = useRef<View>(null);

  function handleTouch(pageX: number) {
    trackRef.current?.measureInWindow((trackX, _trackY, trackWidth) => {
      if (trackWidth <= 0) return;
      const segment = trackWidth / LEVELS.length;
      const level = Math.min(
        LEVELS.length - 1,
        Math.max(0, Math.floor((pageX - trackX) / segment)),
      );
      onChange(level);
    });
  }

  return (
    <View style={checkinStyles.blockRow}>
      <Text style={checkinStyles.questionLabel}>
        Nível de estresse predominante
      </Text>
      <View
        ref={trackRef}
        style={styles.area}
        onTouchStart={(event) => handleTouch(event.nativeEvent.pageX)}
        onTouchMove={(event) => handleTouch(event.nativeEvent.pageX)}
      >
        <View style={styles.track} />
        <View style={styles.row}>
          {LEVELS.map((level) => (
            <Pressable
              key={level}
              testID={`checkin-stress-${level}`}
              accessibilityRole="button"
              accessibilityState={{ selected: value === level }}
              style={styles.column}
              onPress={() => onChange(level)}
            >
              <Text
                style={[
                  styles.number,
                  value === level && styles.numberSelected,
                ]}
              >
                {level}
              </Text>
              <View style={styles.markZone}>
                {value === level ? (
                  <View style={styles.thumb} />
                ) : (
                  <View style={styles.dot} />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    position: "relative",
    paddingTop: 2,
  },
  track: {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 9,
    height: 10,
    borderRadius: 5,
    backgroundColor: TRACK,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  number: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  numberSelected: {
    color: THUMB,
  },
  markZone: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: DOT,
  },
  thumb: {
    width: 5,
    height: 28,
    borderRadius: 3,
    backgroundColor: THUMB,
  },
});
