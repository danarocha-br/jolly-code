import nextEnv from "@next/env";

// Load .env.local and friends before running validation.
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

await import("../src/env.mjs");

console.log("✅ Environment variables look good.");
