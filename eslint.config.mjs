import nextConfig from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      "docs/**",
      ".docs_hidden/**",
      ".next/**",
      "**/.next/**",
    ],
  },
  ...nextConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // TanStack Table's useReactTable() returns functions that cannot be safely memoized by React Compiler
      "react-hooks/incompatible-library": "off",
    },
  },
];

export default eslintConfig;
