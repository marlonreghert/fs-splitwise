import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { groups } from "./groups";

export const expenses = pgTable(
  "expenses", 
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
    payerId: uuid("payer_id").references(() => users.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: integer("amount").notNull(), // Amount in cents to avoid floating-point issues
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    idx_group: index("idx_expenses_group_id").on(table.groupId), // Index for faster group queries
  })    
);
