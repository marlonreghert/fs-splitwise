import { recordSettlement } from "../../src/services/settlementService";
import * as dbModule from "../../src/db/db";
import { sendNotification } from "../../src/services/notificationService";

// Mock the database and notification service
jest.mock("../../src/db/db", () => ({
  db: {
    transaction: jest.fn(),
  },
}));

jest.mock("../../src/services/notificationService", () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

describe("Settlement Service", () => {
  const db = dbModule.db as unknown as {
    transaction: jest.Mock;
  };

  const groupId = "group-123";
  const payerId = "user-123";
  const receiverId = "user-456";

  beforeEach(() => {
    jest.useFakeTimers(); // Control setTimeout
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers(); // Flush any pending timeouts
    jest.useRealTimers();
  });

  describe("recordSettlement", () => {
    it("should record a settlement and update balances", async () => {
      const mockTx = {
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      const result = await recordSettlement(groupId, payerId, receiverId);

      jest.runAllTimers(); // Execute pending timeouts

      // Verify the transaction was called
      expect(db.transaction).toHaveBeenCalledTimes(1);

      // Verify the balance updates
      expect(mockTx.update).toHaveBeenCalledTimes(2);
      expect(mockTx.set).toHaveBeenCalledWith({ owed: 0 });

      // Verify the where conditions
      expect(mockTx.where).toHaveBeenCalledTimes(2);

      // Verify the transaction output
      expect(result).toEqual({ message: "Debt settled successfully" });
    });

    it("should send notifications to payer and receiver", async () => {
      const mockTx = {
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      await recordSettlement(groupId, payerId, receiverId);

      jest.runAllTimers(); // Execute pending timeouts

      // Verify notifications were sent
      expect(sendNotification).toHaveBeenCalledTimes(2);
      expect(sendNotification).toHaveBeenCalledWith(
        payerId,
        "debt_settled",
        "You settled a debt"
      );
      expect(sendNotification).toHaveBeenCalledWith(
        receiverId,
        "debt_settled",
        "A debt was settled with you"
      );
    });

    it("should throw an error if the transaction fails", async () => {
      // Mock the transaction method to throw an error
      (db.transaction as jest.Mock).mockRejectedValueOnce(
        new Error("Transaction failed")
      );

      // Call the function and expect it to throw
      await expect(
        recordSettlement(groupId, payerId, receiverId)
      ).rejects.toThrow("Transaction failed");
    });
  });
});