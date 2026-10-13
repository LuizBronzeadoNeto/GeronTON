import { useEffect } from "react";
import {
  AccessibilityInfo,
  Text,
  type StyleProp,
  type TextStyle,
} from "react-native";

interface Props {
  message: string;
  testID?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Inline form error that screen readers announce as soon as it appears: the
 * live region covers Android and the web, and the explicit announcement covers
 * VoiceOver, which ignores live regions.
 */
export function FormError({ message, testID, style }: Props) {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <Text
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={style}
    >
      {message}
    </Text>
  );
}
