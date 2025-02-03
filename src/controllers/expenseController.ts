import fs from "fs";
import axios from "axios";
import path from "path";
import { Request, Response } from "express";
import { recordExpense, getGroupExpenses, processExpenseFromS3, generatePresignedUrlForBatchUpload } from "../services/expenseService";

export const addExpenseHandler = async (req: Request, res: Response) => {
  const { payerId, description, amount, involvedUserIds } = req.body;
  const { groupId } = req.params;

  if (!groupId || !payerId || !description || !amount || !involvedUserIds || !Array.isArray(involvedUserIds)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    const expense = await recordExpense(groupId, payerId, description, amount, involvedUserIds);
    res.status(201).json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGroupExpensesHandler = async (req: Request, res: Response) => {
  const { groupId } = req.params;

  if (!groupId) {
    return res.status(400).json({ error: "Group ID is required" });
  }

  try {
    const expenses = await getGroupExpenses(groupId);
    res.status(200).json(expenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


// Generate Pre-signed URL for CSV Upload
export const getPresignedUrlHandler = async (req: Request, res: Response) => {
  const { groupId } = req.params;

  if (!groupId ) {
    return res.status(400).json({ error: "Missing group id" });
  }

  try {
    const batchUploadMetadata = await generatePresignedUrlForBatchUpload(groupId);

    res.status(200).json(batchUploadMetadata);
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    res.status(500).json({ error: "Failed to generate pre-signed URL" });
  }
};

export const processUploadedCSVHandler = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { fileId } = req.body; // fileKey refers to the S3 object key

  if (!groupId || !fileId) {
    return res.status(400).json({ error: "Group id and file id are required" });
  }

  try {
    const result = await processExpenseFromS3(groupId, fileId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error processing uploaded CSV:", error);
    res.status(500).json({ error: error.message });
  }
};

