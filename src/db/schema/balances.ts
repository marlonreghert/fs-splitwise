import { pgTable, uuid, integer, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { groups } from "./groups";

export const balances = pgTable(
  "balances",
  {
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // The user who owes money
    fromUserId: uuid("from_user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // The user they owe money to
    owed: integer("owed").notNull(), // Amount owed (can be positive or negative)
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.userId, table.fromUserId] }), // Unique per group & pair
  })
);
