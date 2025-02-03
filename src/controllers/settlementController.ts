import { Request, Response } from "express";
import { recordSettlement } from "../services/settlementService";

export const settleDebtHandler = async (req: Request, res: Response) => {
  const { payerId, receiverId } = req.body;
  const { groupId } = req.params;

  if (!groupId || !payerId || !receiverId) {
    return res.status(400).json({ error: "Group ID, payer ID, receiver ID are required" });
  }

  try {
    const result = await recordSettlement(groupId, payerId, receiverId);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
