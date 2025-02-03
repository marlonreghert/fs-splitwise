import { pgTable, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { groups } from "./groups";

export const groupMembers = pgTable(
  "group_members",
  {
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey(table.userId, table.groupId),
    idx_group: index("idx_group_member_group_id").on(table.groupId), // Index for faster group queries
  }),  
);
