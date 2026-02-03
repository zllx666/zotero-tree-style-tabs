import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["build/**", "node_modules/**", "*.xpi"],
  },
  {
    languageOptions: {
      globals: {
        Zotero: "readonly",
        ZoteroPane: "readonly",
        Zotero_Tabs: "readonly",
        Services: "readonly",
        Components: "readonly",
        rootURI: "readonly",
        console: "readonly",
        globalThis: "readonly",
        __env__: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-undef": "off",
    },
  }
);
