import domenicConfig from "@domenic/eslint-config";
import globals from "globals";

export default [
  {
    ignores: ["coverage/**/*"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
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
    files: ["__tests__/**/*.js"],
    languageOptions: {
      globals: globals.jest
    },
    rules: {
      // Plays poorly with how we set up mocks.
      "no-loop-func": "off"
    }
  }
];
