import { Request, Response } from "express";
import { addExpenseHandler, getGroupExpensesHandler } from "../../src/controllers/expenseController";
import * as expenseService from "../../src/services/expenseService";

jest.mock("../../src/services/expenseService");

describe("Expense Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));

    req = {};
    res = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe("addExpenseHandler", () => {
    it("should return 201 and the expense when data is valid", async () => {
      req.body = {
        payerId: "payer-id",
        description: "Test Expense",
        amount: 1000,
        involvedUserIds: ["user1", "user2"],
      };
      req.params = { groupId: "group-id" };

      const mockExpense = { id: "expense-id", description: "Test Expense" };
      (expenseService.recordExpense as jest.Mock).mockResolvedValue(mockExpense);

      await addExpenseHandler(req as Request, res as Response);

      expect(expenseService.recordExpense).toHaveBeenCalledWith(
        "group-id",
        "payer-id",
        "Test Expense",
        1000,
        ["user1", "user2"]
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockExpense);
    });

    it("should return 400 if request data is invalid", async () => {
      req.body = { description: "Missing Fields" }; // Missing required fields
      req.params = { groupId: "group-id" };

      await addExpenseHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid request data" });
    });

    it("should return 500 if the service throws an error", async () => {
      req.body = {
        payerId: "payer-id",
        description: "Test Expense",
        amount: 1000,
        involvedUserIds: ["user1", "user2"],
      };
      req.params = { groupId: "group-id" };

      (expenseService.recordExpense as jest.Mock).mockRejectedValue(new Error("Database connection failed"));

      await addExpenseHandler(req as Request, res as Response);

      expect(expenseService.recordExpense).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Database connection failed" });
    });
  });

  describe("getGroupExpensesHandler", () => {
    it("should return 200 and expenses when groupId is provided", async () => {
      req.params = { groupId: "group-id" };

      const mockExpenses = [{ id: "1", description: "Expense 1" }];
      (expenseService.getGroupExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      await getGroupExpensesHandler(req as Request, res as Response);

      expect(expenseService.getGroupExpenses).toHaveBeenCalledWith("group-id");
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockExpenses);
    });

    it("should return 400 if groupId is missing", async () => {
      req.params = {};

      await getGroupExpensesHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Group ID is required" });
    });

    it("should return 500 if the service throws an error", async () => {
      req.params = { groupId: "group-id" };

      (expenseService.getGroupExpenses as jest.Mock).mockRejectedValue(new Error("Internal server error"));

      await getGroupExpensesHandler(req as Request, res as Response);

      expect(expenseService.getGroupExpenses).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Internal server error" });
    });
  });
});
