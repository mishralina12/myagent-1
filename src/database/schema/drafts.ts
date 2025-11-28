import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { topics } from './topics';

export const draftStatusEnum = ['draft', 'pending_approval', 'approved', 'rejected', 'published'] as const;

export const drafts = pgTable('drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  generationMetadata: jsonb('generation_metadata').$type<{
    model?: string;
    prompt_version?: string;
    request_id?: string;
    temperature?: number;
  }>(),
  complianceChecks: jsonb('compliance_checks').$type<{
    passed?: boolean;
    flags?: string[];
    suggestions?: string[];
    checked_at?: string;
  }>(),
  version: integer('version').notNull().default(1),
  status: text('status').notNull().default('draft'), // draft | pending_approval | approved | rejected | published
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Draft = typeof drafts.$inferSelect;
export type NewDraft = typeof drafts.$inferInsert;
