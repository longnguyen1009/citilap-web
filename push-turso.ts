import { createClient } from "@libsql/client";
import fs from "fs";
import "dotenv/config";

async function pushSchema() {
  console.log("Connecting to Turso:", process.env.DATABASE_URL);
  
  const client = createClient({
    url: process.env.DATABASE_URL as string,
    authToken: process.env.DATABASE_AUTH_TOKEN as string,
  });

  try {
    const sql = fs.readFileSync("schema.sql", "utf-8");
    const statements = sql.split(";").filter((stmt) => stmt.trim() !== "");
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    
    console.log("Schema pushed successfully to Turso!");
  } catch (err) {
    console.error("Failed to push schema:", err);
  }
}

pushSchema();
