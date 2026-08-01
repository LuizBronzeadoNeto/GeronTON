module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  /**
   * babel-jest compiles the sources down to CommonJS and skips node_modules,
   * but expo-server-sdk ships ESM only. Without this exception every suite
   * fails to load the moment services/push.ts imports it — even the ones that
   * never send a notification.
   */
  transformIgnorePatterns: ["node_modules/(?!(expo-server-sdk)/)"],
  setupFiles: ["dotenv/config"],
};
