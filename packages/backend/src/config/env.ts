import "dotenv/config";
import { z } from "zod";

const BoolFromString = z
  .enum(["true", "false"])
  .default("true")
  .transform((v) => v === "true");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DB_HOST: z.string().min(1).default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1).default("nythera"),
  CORS_ORIGIN: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  // The backend serves the built frontend itself by default (same-origin deployment behind
  // a single reverse-proxy host, e.g. CloudPanel/nginx pointing at this one port) - set
  // SERVE_FRONTEND=false if the frontend is hosted separately.
  SERVE_FRONTEND: BoolFromString,
  FRONTEND_DIST_PATH: z.string().optional(),
  // Public origin used to build absolute redirect/return URLs (billing checkout success,
  // bot invite links). Falls back to constructing one from the request if unset.
  APP_PUBLIC_URL: z.string().optional(),

  // Billing (sandbox/test mode by default) - all optional so the app boots without real
  // keys; the actual provider calls simply fail until real sandbox credentials are supplied.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_PLAN_ID: z.string().optional(),
  PAYPAL_API_BASE: z.string().default("https://api-m.sandbox.paypal.com"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
