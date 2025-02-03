import { db } from "../db/db";
import { balances } from "../db/schema/balances";
import { eq, sql, and } from "drizzle-orm";
import { sendNotification } from "./notificationService"; // Import notification service

export const recordSettlement = async (
  groupId: string,
  payerId: string,
  receiverId: string
) => {
  const transaction_output = await db.transaction(async (tx) => {
    // Update Balances using `and()` to combine conditions      
    await tx
      .update(balances)
      .set({
        owed: 0,
      })
      .where(
        and(
          eq(balances.groupId, groupId),
          eq(balances.userId, payerId),
          eq(balances.fromUserId, receiverId)
        )
      );

    await tx
      .update(balances)
      .set({
        owed: 0,
      })
      .where(
        and(
          eq(balances.groupId, groupId),
          eq(balances.userId, receiverId),
          eq(balances.fromUserId, payerId)
        )
      );

    return { message: "Debt settled successfully" };
  });

  if (transaction_output) {
    // Fire & Forget Notification
    setTimeout(() => {
      sendNotification(
        payerId,
        "debt_settled",
        `You settled a debt`
      ).catch((err) => console.error("Error sending notification:", err));
    }, 0);

    // Fire & Forget Notification
    setTimeout(() => {
      sendNotification(
        receiverId,
        "debt_settled",
        `A debt was settled with you`
      ).catch((err) => console.error("Error sending notification:", err));
    }, 0);
  }

  return transaction_output
};
