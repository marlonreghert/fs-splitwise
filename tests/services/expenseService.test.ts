import {
    recordExpense,
    getGroupExpenses,
    processExpenseCSV,
    generatePresignedUrlForBatchUpload,
    processExpenseFromS3,
  } from "../../src/services/expenseService";
  import * as dbModule from "../../src/db/db";
  import * as s3Service from "../../src/services/s3Service";
  import { sendNotification } from "../../src/services/notificationService";
  import fs from "fs";
  
  jest.mock("../../src/db/db", () => ({
    db: {
      transaction: jest.fn(),
      query: {
        expenses: {
          findMany: jest.fn(),
        },
      },
    },
  }));
  
  jest.mock("../../src/services/s3Service", () => ({
    generatePresignedUrl: jest.fn(),
    downloadFileFromS3: jest.fn(),
  }));
  
  jest.mock("../../src/services/notificationService", () => ({
    sendNotification: jest.fn().mockResolvedValue(undefined), 
  }));
  
  describe("Expense Service", () => {
    const db = dbModule.db as unknown as {
      transaction: jest.Mock;
      query: {
        expenses: {
          findMany: jest.Mock;
        };
      };
    };
  
    beforeEach(() => {
      jest.useFakeTimers(); // Control setTimeout
      jest.clearAllMocks();
    });
  
    afterEach(() => {
      jest.runOnlyPendingTimers(); // Flush any pending timeouts
      jest.useRealTimers();
    });
  
    describe("recordExpense", () => {
      it("should record an expense and update balances", async () => {
        const mockTx = {
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: "expense-id" }]),
          onConflictDoUpdate: jest.fn().mockReturnThis(),
        };
  
        (db.transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));
  
        const result = await recordExpense(
          "group-id",
          "payer-id",
          "Test Expense",
          1000,
          ["user1", "user2"]
        );
  
        jest.runAllTimers(); // Execute pending timeouts
  
        expect(mockTx.insert).toHaveBeenCalledTimes(5); // 1 for expense, 4 for balances
        expect(sendNotification).toHaveBeenCalledTimes(3); // 1 for payer, 2 for users
        expect(result).toEqual({ id: "expense-id" });
      });
  
      it("should throw an error if expense insertion fails", async () => {
        const mockTx = {
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([]), // Simulate failure
        };
  
        (db.transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));
  
        await expect(
          recordExpense("group-id", "payer-id", "Test Expense", 1000, ["user1"])
        ).rejects.toThrow("Failed to record expense");
      });
    });
  
    describe("getGroupExpenses", () => {
      it("should fetch expenses for a group", async () => {
        const mockExpenses = [{ id: "1", description: "Expense 1" }];
        (db.query.expenses.findMany as jest.Mock).mockResolvedValue(mockExpenses);
  
        const result = await getGroupExpenses("group-id");
  
        expect(db.query.expenses.findMany).toHaveBeenCalledWith({
          where: expect.anything(),
          columns: expect.anything(),
        });
        expect(result).toEqual(mockExpenses);
      });
    });
  
    describe("generatePresignedUrlForBatchUpload", () => {
      it("should generate a presigned URL for batch upload", async () => {
        (s3Service.generatePresignedUrl as jest.Mock).mockResolvedValue(
          "https://s3-presigned-url"
        );
  
        const result = await generatePresignedUrlForBatchUpload("group-id");
  
        expect(result).toHaveProperty("fileId");
        expect(result.presignedUrl).toBe("https://s3-presigned-url");
      });
    });
  
    describe("processExpenseFromS3", () => {
      it("should process an expense file from S3", async () => {
        (s3Service.downloadFileFromS3 as jest.Mock).mockResolvedValue("/tmp/mock.csv");
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        jest.spyOn(fs, "unlinkSync").mockImplementation(() => {});
  
        const mockProcessCSV = jest
          .spyOn(require("../../src/services/expenseService"), "processExpenseCSV")
          .mockResolvedValue({
            message: "File processed successfully",
            processed: 1,
          });
  
        const result = await processExpenseFromS3("group-id", "file-id");
  
        expect(s3Service.downloadFileFromS3).toHaveBeenCalled();
        expect(mockProcessCSV).toHaveBeenCalled();
        expect(result).toEqual({
          message: "File processed successfully",
          result: { message: "File processed successfully", processed: 1 },
        });
      });
    });
  });
  