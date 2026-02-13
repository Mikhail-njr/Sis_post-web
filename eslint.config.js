import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ["**/*.html"],
    ...html.configs.recommended,
  },
  {
    rules: {
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-duplicate-imports": "error",
      "no-extra-semi": "error",
      "no-redeclare": "error",
      "no-unused-vars": "warn",
      "no-use-before-define": "error"
    }
  }
];