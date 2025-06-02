import domenicConfig from "@domenic/eslint-config";
import globals from "globals";

export default [
  {
    ignores: ["coverage/**/*"]
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: globals.node
    }
  },
  ...domenicConfig,
  {
    rules: {
      camelcase: ["error", { properties: "never" }]
    }
  },
  {
    files: ["__tests__/**/*.mjs"],
    rules: {
      // Plays poorly with how we set up mocks.
      "no-loop-func": "off"
    }
  }
];
