import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["**/generated/*"],
    rules: {
      "no-unused-vars": "warn",
      "@typescript/no-unused-vars": "warn", // also add this if you're using typescript
    },
  },
];

export default eslintConfig;
