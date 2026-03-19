const globals = require("./microdatos-etl/node_modules/globals");

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ["**/node_modules/**", "microdatos-etl/data/**"],
  },
  {
    files: ["microdatos-etl/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      eqeqeq: "error",
      "no-console": "warn",
    },
  },
  {
    files: ["dgt-matriculaciones-moto/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      eqeqeq: "error",
      "no-console": "warn",
    },
  },
];
