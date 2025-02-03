import "dotenv/config"; // Load environment variables immediately
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema"; // Ensure schema is correctly imported

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Check your .env file.");
  process.exit(1); // Stop execution if no database URL is found
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10, // Maximum number of connections
});

export const db = drizzle(pool, { schema });

console.log("✅ Database connection initialized successfully.");
