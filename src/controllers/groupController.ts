import { Request, Response } from "express";
import { createGroup, getGroupBalancesWithAllinfo, getAllGroups } from "../services/groupService";

export const createGroupHandler = async (req: Request, res: Response) => {
  const { name, memberIds } = req.body;

  if (!name || !memberIds || !Array.isArray(memberIds)) {
    return res.status(400).json({ error: "Group name and member IDs are required" });
  }

  try {
    const group = await createGroup(name, memberIds);
    res.status(201).json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getBalancesHandler = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  
  if (!groupId) {
    return res.status(400).json({ error: "Group ID is required" });
  }

  try {
    const balances = await getGroupBalancesWithAllinfo(groupId);
    res.status(200).json(balances);
  } catch (error: any) {
    console.error("Error fetching balances:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const getAllGroupsHandler = async (req: Request, res: Response) => {
  try {
    const allGroups = await getAllGroups();
    res.status(200).json(allGroups);
  } catch (error: any) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};