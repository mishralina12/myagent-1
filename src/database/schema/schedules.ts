import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { drafts } from './drafts';

export const scheduleStatusEnum = ['pending', 'processing', 'published', 'failed', 'cancelled'] as const;

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  draftId: uuid('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scheduledFor: timestamp('scheduled_for').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  status: text('status').notNull().default('pending'), // pending | processing | published | failed | cancelled
  jobId: text('job_id'), // BullMQ job ID
  retryCount: integer('retry_count').notNull().default(0),
  publishedAt: timestamp('published_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
