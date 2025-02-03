import { Request, Response } from "express";
import { createGroupHandler, getBalancesHandler, getAllGroupsHandler } from "../../src/controllers/groupController";
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

  describe("createGroupHandler", () => {
    it("should return 201 and the created group when data is valid", async () => {
      req.body = { name: "Trip Group", memberIds: ["user1", "user2"] };

      const mockGroup = { id: "group-id", name: "Trip Group" };
      (groupService.createGroup as jest.Mock).mockResolvedValue(mockGroup);

      await createGroupHandler(req as Request, res as Response);

      expect(groupService.createGroup).toHaveBeenCalledWith("Trip Group", ["user1", "user2"]);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockGroup);
    });

    it("should return 400 if request data is invalid", async () => {
      req.body = { name: "Invalid Group" };

      await createGroupHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Group name and member IDs are required" });
    });

    it("should return 500 if service throws an error", async () => {
      req.body = { name: "Error Group", memberIds: ["user1"] };
      (groupService.createGroup as jest.Mock).mockRejectedValue(new Error("Database error"));

      await createGroupHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Database error" });
    });
  });

  describe("getBalancesHandler", () => {
    it("should return 200 and balances when groupId is provided", async () => {
      req.params = { groupId: "group-id" };

      const mockBalances = [{ userId: "user1", owed: 100 }];
      (groupService.getGroupBalancesWithAllinfo as jest.Mock).mockResolvedValue(mockBalances);

      await getBalancesHandler(req as Request, res as Response);

      expect(groupService.getGroupBalancesWithAllinfo).toHaveBeenCalledWith("group-id");
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockBalances);
    });

    it("should return 400 if groupId is missing", async () => {
      req.params = {};

      await getBalancesHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Group ID is required" });
    });

    it("should return 500 if service throws an error", async () => {
      req.params = { groupId: "group-id" };
      (groupService.getGroupBalancesWithAllinfo as jest.Mock).mockRejectedValue(new Error("Internal Server Error"));

      await getBalancesHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Internal Server Error" });
    });
  });

  describe("getAllGroupsHandler", () => {
    it("should return 200 and all groups", async () => {
      const mockGroups = [{ id: "group1", name: "Group 1" }];
      (groupService.getAllGroups as jest.Mock).mockResolvedValue(mockGroups);

      await getAllGroupsHandler(req as Request, res as Response);

      expect(groupService.getAllGroups).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockGroups);
    });

    it("should return 500 if service throws an error", async () => {
      (groupService.getAllGroups as jest.Mock).mockRejectedValue(new Error("Failed to fetch groups"));

      await getAllGroupsHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Failed to fetch groups" });
    });
  });
});
