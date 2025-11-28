import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { drafts } from './drafts';

export const approvalActionEnum = ['approved', 'rejected', 'requested_changes'] as const;

export const approvals = pgTable('approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  draftId: uuid('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // approved | rejected | requested_changes
  feedback: text('feedback'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
