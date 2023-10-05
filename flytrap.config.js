import { defineFlytrapConfig } from "useflytrap";

export default defineFlytrapConfig({
  projectId: process.env.FLY_TRAP_PROJECT_ID,
  publicApiKey: process.env.FLY_TRAP_PUBLIC_API_KEY,
  secretApiKey: process.env.FLY_TRAP_SECRET_API_KEY,
  privateKey: process.env.FLY_TRAP_PRIVATE_KEY,
  mode: "capture",
  packageIgnores: ['next/font'],
});
