import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { formStyles } from "./formStyles";

/** Height of the stack header, which the iOS keyboard offset must clear. */
const IOS_HEADER_OFFSET = 64;

/**
 * Outer frame of every form: a scrolling body above an ActionBar. It lifts
 * both above the on-screen keyboard, so the form's main button stays
 * reachable while a field is being typed in (the numeric pad has no return
 * key to dismiss it).
 */
export function FormScreen({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={formStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? IOS_HEADER_OFFSET : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
