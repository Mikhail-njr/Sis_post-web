module.exports = {
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "no-dupe-keys": "error",
    "no-duplicate-case": "error",
    "no-duplicate-imports": "error",
    "no-extra-semi": "error",
    "no-redeclare": "error",
    "no-unused-vars": "warn",
    "no-use-before-define": "error"
  }
};