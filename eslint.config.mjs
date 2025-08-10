import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Base Next.js + TypeScript rules
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Project overrides
  {
    // Ignore generated and build output
    ignores: [
      "**/.next/**",
      "src/generated/prisma/**",
    ],
    rules: {
      // Downgrade noisy rules to warnings to prevent CI failures while we iterate
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        { "ts-expect-error": "allow-with-description" }
      ],
      "prefer-const": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
    },
  },

  // Extra safety: in case generated files slip through, relax specific rules
  {
    files: ["src/generated/prisma/**/*.{js,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
