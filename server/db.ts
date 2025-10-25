import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let db: ReturnType<typeof drizzle>;
let isInitialized = false;

export async function initDB() {
  if (!isInitialized) {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    db = drizzle(connection, { schema, mode: 'default' });
    isInitialized = true;
  }
  return db;
}

// Initialize database connection immediately
(async () => {
  try {
    await initDB();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
})();

export { db };
