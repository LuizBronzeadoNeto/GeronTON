/**
 * expo-secure-store is a native module with no JS implementation under jest, so
 * the session layer is backed by an in-memory map during tests. Each test file
 * gets a fresh module registry and therefore a fresh store.
 */
jest.mock("expo-secure-store", () => {
  const store = new Map();

  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});

/**
 * expo-notifications is a native module with no JS implementation under jest,
 * and src/push/index.ts calls setNotificationHandler at import time. Anything
 * that reaches the push module transitively — AuthContext does, through
 * sign-out — would crash on import without this.
 *
 * The stub denies permission and hands back no token, so the native variant
 * reports itself unusable. Tests that care about push behaviour mock the push
 * module itself rather than driving it through this.
 */
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "undetermined", canAskAgain: true }),
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "denied", canAskAgain: false }),
  ),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: null })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));

/**
 * expo-device reports the host, and under jest there is no device at all.
 * Reporting a simulator keeps the native push module in its "unsupported"
 * branch, which is the truthful answer for a test run.
 */
jest.mock("expo-device", () => ({ isDevice: false }));
