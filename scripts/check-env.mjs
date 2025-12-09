// Try to load .env.local and friends before running validation.
// In build environments like Vercel, env vars are already in process.env,
// so @next/env might not be available or needed.
let envLoaded = false;
try {
  const nextEnv = await import("@next/env");
  const loadEnvConfig = nextEnv.default?.loadEnvConfig || nextEnv.loadEnvConfig;
  if (loadEnvConfig) {
    const result = loadEnvConfig(process.cwd());
    envLoaded = true;
    if (result?.loadedEnvFiles?.length > 0) {
      console.log(`📝 Loaded ${result.loadedEnvFiles.length} env file(s):`, result.loadedEnvFiles.map(f => f.path).join(", "));
    }
  }
} catch (error) {
  // @next/env not available - this is fine in build environments
  // where env vars are already loaded
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    // Silently continue - env vars are already available in build environment
    envLoaded = true;
  } else {
    console.warn("⚠️  Could not load @next/env:", error.message);
    console.warn("💡 Make sure you have a .env.local file with required variables, or set SKIP_ENV_VALIDATION=true");
  }
}

// Skip validation if explicitly requested
if (process.env.SKIP_ENV_VALIDATION === "true") {
  console.log("⏭️  Skipping environment variable validation (SKIP_ENV_VALIDATION=true)");
  process.exit(0);
}

try {
  await import("../src/env.mjs");
  console.log("✅ Environment variables look good.");
} catch (error) {
  if (error.message?.includes("Invalid environment variables")) {
    console.error("\n❌ Environment validation failed!");
    console.error("\n💡 To fix this:");
    console.error("   1. Create a .env.local file in the project root");
    console.error("   2. Add all required environment variables (see src/env.mjs for the list)");
    console.error("   3. Or set SKIP_ENV_VALIDATION=true to skip validation\n");
    process.exit(1);
  }
  throw error;
}

