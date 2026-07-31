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
    files: ["jest.setup.js"],
    languageOptions: {
      globals: { jest: "readonly" },
    },
  },
  {
    ignores: ["dist/**", ".expo/**"],
  },
]);
