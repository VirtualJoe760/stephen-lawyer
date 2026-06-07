import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env.development.local" });
loadEnv({ path: ".env" });

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
