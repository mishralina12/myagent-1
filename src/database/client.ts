import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/myagent';

// Create postgres connection
const queryClient = postgres(databaseUrl);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Export the client for closing connections
export const closeDatabase = async () => {
  await queryClient.end();
};
