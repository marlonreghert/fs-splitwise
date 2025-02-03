import { Request, Response } from "express";
import { getBalancesHandler, getAllGroupsHandler } from "../../src/controllers/groupController";
import * as groupService from "../../src/services/groupService";

jest.mock("../../src/services/groupService");

describe("Group Controller", () => {
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

  describe("getBalancesHandler", () => {
    it("should return balances for a group", async () => {
      req.params = { groupId: "group-id" };

      const mockBalances = [{ userId: "1", owesTo: "2", owedAmount: 100 }];
      (groupService.getGroupBalancesWithAllinfo as jest.Mock).mockResolvedValue(mockBalances);

      await getBalancesHandler(req as Request, res as Response);

      expect(groupService.getGroupBalancesWithAllinfo).toHaveBeenCalledWith("group-id");
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockBalances);
    });

    it("should handle service errors", async () => {
      req.params = { groupId: "group-id" };
      (groupService.getGroupBalancesWithAllinfo as jest.Mock).mockRejectedValue(new Error("Internal Server Error"));

      await getBalancesHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Internal Server Error" });
    });
  });

  describe("getAllGroupsHandler", () => {
    it("should return all groups", async () => {
      const mockGroups = [{ id: "1", name: "Group 1" }];
      (groupService.getAllGroups as jest.Mock).mockResolvedValue(mockGroups);

      await getAllGroupsHandler(req as Request, res as Response);

      expect(groupService.getAllGroups).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockGroups);
    });

    it("should handle errors when fetching groups", async () => {
      (groupService.getAllGroups as jest.Mock).mockRejectedValue(new Error("Failed to fetch groups"));

      await getAllGroupsHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Failed to fetch groups" });
    });
  });
});
