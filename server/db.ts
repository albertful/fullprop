import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use the new Railway public database URL
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:rVMKGsuVxoftzDsuhNgwvdbhdBgPDFxN@trolley.proxy.rlwy.net:27565/railway";

console.log("Connecting to Railway database...");

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

// Test connection on startup
pool.connect()
  .then(client => {
    console.log("✅ Database connected successfully");
    client.release();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err.message);
  });