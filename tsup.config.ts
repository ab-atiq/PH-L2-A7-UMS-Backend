import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  // format: ["esm", "cjs"], // Keep this as ESM
  format: ["esm"], // Keep this as ESM
  target: "esnext",
  platform: "node",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: false,
  // Add this banner to shim require() for CJS dependencies
  banner: {
    js: `
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
  `,
  },
});
