import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const catalogs = sqliteTable('catalogs', {
 id: integer('id').primaryKey(),
 revision: integer('revision').notNull().default(0),
 body: text('body').notNull(),
 updatedBy: text('updated_by').notNull(),
 updatedAt: text('updated_at').notNull(),
});
