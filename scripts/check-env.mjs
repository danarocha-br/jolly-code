// Try to load .env.local and friends before running validation.
// In build environments like Vercel, env vars are already in process.env,
// so @next/env might not be available or needed.
try {
  const nextEnv = await import("@next/env");
  if (nextEnv?.loadEnvConfig) {
    nextEnv.loadEnvConfig(process.cwd());
  }
} catch (error) {
  // @next/env not available - this is fine in build environments
  // where env vars are already loaded
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    // Silently continue - env vars are already available in build environment
  } else {
    console.warn("⚠️  Could not load @next/env, continuing with process.env:", error.message);
  }
}

await import("../src/env.mjs");

console.log("✅ Environment variables look good.");
