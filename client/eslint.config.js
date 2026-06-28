const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettier = require("eslint-config-prettier");

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    rules: {
      "import/no-named-as-default-member": "off",
    },
  },
  {
    ignores: ["dist/**", ".expo/**"],
  },
  {
    files: ["e2e/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        device: "readonly",
        element: "readonly",
        by: "readonly",
        waitFor: "readonly",
      },
    },
  },
]);
