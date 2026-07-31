import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client output — not hand-written source.
    "lib/prisma-client/**",
    "lib/generated/**",
  ]),
  {
    // The demo database is a query engine over untyped rows: a row is
    // `Record<string, any>` by construction, and the delegates cast once at the
    // boundary where results become typed model rows. Everything the rest of
    // the app touches is fully typed (see lib/demo-db/types.ts), so the rule
    // stays on everywhere else.
    files: ["lib/demo-db/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    rules: {
      // Allow intentionally-unused vars/args prefixed with "_"
      // (e.g. discarding a field via a rest pattern).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);

export default eslintConfig;
