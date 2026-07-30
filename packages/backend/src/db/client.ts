import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

export const sql = postgres(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
export type Db = typeof db;
