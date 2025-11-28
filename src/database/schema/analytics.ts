import { pgTable, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { publishedPosts } from './published-posts';

export const analytics = pgTable('analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => publishedPosts.id, { onDelete: 'cascade' }),
  collectedAt: timestamp('collected_at').notNull().defaultNow(),
  metrics: jsonb('metrics').$type<{
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    engagement_rate?: number;
  }>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;
