import { pgTable, uuid, varchar, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const providerEnum = ['linkedin', 'google'] as const;

export const oauthProviders = pgTable('oauth_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'linkedin' | 'google'
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  accessToken: text('access_token').notNull(), // Encrypted in production
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: text('scopes').array(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserProvider: unique().on(table.userId, table.provider),
}));

export type OAuthProvider = typeof oauthProviders.$inferSelect;
export type NewOAuthProvider = typeof oauthProviders.$inferInsert;
