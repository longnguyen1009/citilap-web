import "dotenv/config";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

async function main() {
  console.log("DB_URL IS:", process.env.DATABASE_URL);
  
  const { PrismaClient } = require("./generated/prisma/client");
  
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL as string,
    authToken: process.env.DATABASE_AUTH_TOKEN
  });
  const prisma = new PrismaClient({ adapter });
  
  try {
    const categories = await prisma.category.findMany();
    console.log("SUCCESS:", categories);
  } catch (err) {
    console.error("FAILED:", err);
  }
}
main();
