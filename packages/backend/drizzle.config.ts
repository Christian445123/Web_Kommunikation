import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  // NOTE: db:generate must be run via `tsx` (see package.json), not plain `drizzle-kit
  // generate` - drizzle-kit's own loader can't resolve our NodeNext-style ".js"-suffixed
  // relative imports (e.g. "./users.js") against sibling *.ts source files. Running it under
  // tsx applies tsx's process-wide module resolution hook to drizzle-kit's own requires too,
  // the same hook that already lets `tsx src/db/migrate.ts` import this same schema fine.
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "nythera",
  },
});
