import { db } from "../db/db";
import { groups } from "../db/schema/groups";
import { groupMembers } from "../db/schema/groupMembers";
import { balances } from "../db/schema/balances";
import { users } from "../db/schema/users";
import { eq, inArray } from "drizzle-orm";

export const createGroup = async (name: string, memberIds: string[]) => {
  return await db.transaction(async (tx) => {
    // Create the Group
    const [group] = await tx.insert(groups).values({ name }).returning();

    // Add Members to Group
    await tx.insert(groupMembers).values(
      memberIds.map((userId) => ({
        groupId: group.id,
        userId,
      }))
    );

    // Initialize Balances for Each Member
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = 0; j < memberIds.length; j++) {
        if (i !== j) {
          await tx.insert(balances)
            .values({
              groupId: group.id,
              userId: memberIds[i],
              fromUserId: memberIds[j],
              owed: 0, // Initial balance set to 0
            })
            .onConflictDoNothing(); // Prevent duplicate entries
        }
      }
    }

    return { group, members: memberIds };
  });
};

export const getGroupBalances = async (groupId: string) => {
  return await db
    .select({
      userId: balances.userId,
      fromUserId: balances.fromUserId,
      owed: balances.owed,
    })
    .from(balances)
    .where(eq(balances.groupId, groupId));
};

export const getGroupBalancesWithAllinfo = async (groupId: string) => {
  const balancesData = await getGroupBalances(groupId);

  // Extract unique user IDs
  const userIds = [
    ...new Set(balancesData.flatMap(({ userId, fromUserId }) => [userId, fromUserId])),
  ];

  // Fetch user details in one query
  const usersData = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds));

  // Convert user array to a map for fast lookups
  const userMap = new Map(usersData.map((user) => [user.id, user.name]));

  // Enrich balance data with user names
  return balancesData.map((balance) => ({
    user: {
      id: balance.userId,
      name: userMap.get(balance.userId) || "Unknown",
    },
    owesTo: {
      id: balance.fromUserId,
      name: userMap.get(balance.fromUserId) || "Unknown",
    },
    owedAmount: balance.owed, // Positive = Owed, Negative = Owes
  }));
};

export const getAllGroups = async () => {
  return await db.query.groups.findMany({
    columns: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
};