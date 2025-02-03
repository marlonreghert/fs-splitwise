import { Request, Response } from "express";
import { settleDebtHandler } from "../../src/controllers/settlementController";
import * as settlementService from "../../src/services/settlementService";

jest.mock("../../src/services/settlementService");

describe("Settlement Controller", () => {
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

  describe("settleDebtHandler", () => {
    it("should return 201 and settlement result when data is valid", async () => {
      req.body = { payerId: "payer-id", receiverId: "receiver-id" };
      req.params = { groupId: "group-id" };

      const mockResult = { message: "Debt settled successfully" };
      (settlementService.recordSettlement as jest.Mock).mockResolvedValue(mockResult);

      await settleDebtHandler(req as Request, res as Response);

      expect(settlementService.recordSettlement).toHaveBeenCalledWith("group-id", "payer-id", "receiver-id");
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });

    it("should return 400 if required data is missing", async () => {
      req.body = { payerId: "payer-id" }; // Missing receiverId
      req.params = { groupId: "group-id" };

      await settleDebtHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Group ID, payer ID, receiver ID are required" });
    });

    it("should return 500 if service throws an error", async () => {
      req.body = { payerId: "payer-id", receiverId: "receiver-id" };
      req.params = { groupId: "group-id" };

      (settlementService.recordSettlement as jest.Mock).mockRejectedValue(new Error("Database error"));

      await settleDebtHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Database error" });
    });
  });
});
