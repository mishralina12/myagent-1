import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { drafts } from './drafts';
import { schedules } from './schedules';

export const providerEnum = ['linkedin'] as const;

export const publishedPosts = pgTable('published_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  draftId: uuid('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  scheduleId: uuid('schedule_id').references(() => schedules.id, { onDelete: 'set null' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // linkedin
  providerPostId: text('provider_post_id').notNull(), // LinkedIn URN
  postUrl: text('post_url').notNull(),
  publishedAt: timestamp('published_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type PublishedPost = typeof publishedPosts.$inferSelect;
export type NewPublishedPost = typeof publishedPosts.$inferInsert;
