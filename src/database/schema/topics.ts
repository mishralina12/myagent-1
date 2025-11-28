import { pgTable, uuid, varchar, text, timestamp, real, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const topicSourceEnum = ['manual', 'trending', 'ai_suggested'] as const;
export const topicStatusEnum = ['discovered', 'selected', 'drafted', 'archived'] as const;

export const topics = pgTable('topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  source: varchar('source', { length: 50 }).notNull(), // manual | trending | ai_suggested
  sourceUrl: text('source_url'),
  relevanceScore: real('relevance_score').default(0), // 0-1 scale
  status: varchar('status', { length: 50 }).notNull().default('discovered'), // discovered | selected | drafted | archived
  metadata: jsonb('metadata').$type<{
    keywords?: string[];
    category?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
