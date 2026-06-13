export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      "out/**",
      "release/**",
      "node_modules/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
];
