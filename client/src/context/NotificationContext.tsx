import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationToast } from "../components/NotificationToast";

export interface AppNotification {
  title: string;
  message: string;
  critical?: boolean;
}

interface NotificationContextValue {
  notify: (notification: AppNotification) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const AUTO_DISMISS_MS = 6000;

/**
 * App-wide in-app notifications: `notify` floats a NotificationToast over
 * whatever screen is visible (below the status bar), replacing any previous
 * one. The toast auto-dismisses after a few seconds or on its X button.
 * Registered above the navigator so a notification survives the navigation
 * that usually follows the action that raised it.
 */
export function NotificationProvider({
  children,
  autoDismissMs = AUTO_DISMISS_MS,
}: {
  children: ReactNode;
  autoDismissMs?: number;
}) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setCurrent(null);
  }, [clearTimer]);

  const notify = useCallback(
    (notification: AppNotification) => {
      clearTimer();
      setCurrent(notification);
      timer.current = setTimeout(() => {
        timer.current = null;
        setCurrent(null);
      }, autoDismissMs);
    },
    [autoDismissMs, clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo<NotificationContextValue>(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {current ? (
          <View
            style={[styles.overlay, { top: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <NotificationToast
              testID="app-notification"
              title={current.title}
              message={current.message}
              critical={current.critical}
              onDismiss={dismiss}
            />
          </View>
        ) : null}
      </View>
    </NotificationContext.Provider>
  );
}

/**
 * Access the notification context. Throws if used outside a
 * NotificationProvider.
 */
export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    left: 16,
    right: 16,
  },
});
