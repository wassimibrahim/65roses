import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  prettier,
  {
    ignores: ["node_modules/**", ".next/**", "coverage/**", "playwright-report/**"],
  },
  {
    rules: {
      // Stripe may only be touched through the PaymentProvider interface.
      // The provider directory itself overrides this below.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "stripe",
              message:
                "Import the PaymentProvider interface from src/lib/providers/payment instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/providers/payment/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

export default config;
