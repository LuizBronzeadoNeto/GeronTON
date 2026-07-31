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
