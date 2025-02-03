import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config(); 

console.log(process.env.DATABASE_URL)

export default defineConfig({
  schema: "./src/db/schema", 
  out: "./src/db/migrations",
  dialect: "postgresql",     
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
