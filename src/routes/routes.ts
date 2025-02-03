import { createUserHandler, getAllUsersHandler } from "../controllers/userController";
import { createGroupHandler, getBalancesHandler, getAllGroupsHandler } from "../controllers/groupController";
import { addExpenseHandler,
  getGroupExpensesHandler,
  getPresignedUrlHandler,
  processUploadedCSVHandler } from "../controllers/expenseController";
import { settleDebtHandler } from "../controllers/settlementController";
import express from "express";
import path from "path";

const router = express.Router();

// User Routes
router.post("/users", createUserHandler);
router.get("/users", getAllUsersHandler);

// Group Routes
router.get("/groups", getAllGroupsHandler); // Route to list all groups
router.post("/groups", createGroupHandler); // Create a new group

// Expense Routes
router.post("/groups/:groupId/expenses", addExpenseHandler); // Add an expense to a group

// Generate Pre-signed URL
router.get("/groups/:groupId/expenses/upload/presigned-url", getPresignedUrlHandler);

// Notify Backend to Process CSV after Upload
router.post("/groups/:groupId/expenses/upload/process", processUploadedCSVHandler);


// Fetch all expenses for a group
router.get("/groups/:groupId/expenses", getGroupExpensesHandler);

// Balance Routes
router.get("/groups/:groupId/balances", getBalancesHandler); // Get balances for a group

// Settlement Routes
router.post("/groups/:groupId/settlements", settleDebtHandler); // Settle a debt between members

export default router;
