import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const meta = pgTable('_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});
