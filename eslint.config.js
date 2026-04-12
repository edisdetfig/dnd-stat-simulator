// Minimal ESLint config — exists primarily to enforce no-dupe-keys so
// theme files can never silently drop tokens again. Broader lint rules
// are out of scope for this config; we may grow it later.

export default [
  {
    files: ["src/**/*.js", "src/**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-dupe-keys": "error",
    },
  },
];
