import { db } from "../db/db";
import { expenses } from "../db/schema/expenses";
import { balances } from "../db/schema/balances";
import { generatePresignedUrl, downloadFileFromS3 } from './s3Service'
import { sendNotification } from "./notificationService";
import { sql, eq } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import fs from "fs";
import axios from "axios";
import path from "path";

export const recordExpense = async (
  groupId: string,
  payerId: string,
  description: string,
  amount: number,
  involvedUserIds: string[]
) => {
  const expense = await db.transaction(async (tx) => {
    //  Insert Expense
    const [expense] = await tx.insert(expenses)
      .values({
        groupId,
        payerId,
        description,
        amount,
      })
      .returning();

    if (!expense) throw new Error("Failed to record expense");

    // Split Expense
    const individualAmount = Math.floor(amount / (1 + involvedUserIds.length));
    // For simplicity lets assume the payer always takes care of the remainder
    // const remainder = amount % involvedUserIds.length;

    for (let i = 0; i < involvedUserIds.length; i++) {
      const memberId = involvedUserIds[i];
      const adjustedAmount = individualAmount;
      
      // Update Balances (User owes Payer)
      await tx
        .insert(balances)
        .values({
          groupId,
          userId: memberId, // The user who owes
          fromUserId: payerId, // The payer who is owed
          owed: -adjustedAmount, // Negative means the user owes
        })
        .onConflictDoUpdate({
          target: [balances.groupId, balances.userId, balances.fromUserId],
          set: { owed: sql`${balances.owed} - ${adjustedAmount}` },
        });

      // Update Balances (Payer is owed by User)
      await tx
        .insert(balances)
        .values({
          groupId,
          userId: payerId, // The payer who is owed
          fromUserId: memberId, // The user who owes
          owed: adjustedAmount, // Positive means the payer is owed
        })
        .onConflictDoUpdate({
          target: [balances.groupId, balances.userId, balances.fromUserId],
          set: { owed: sql`${balances.owed} + ${adjustedAmount}` },
        }); 
    } 

    return expense;
  });

  if (expense) {
    // Fire & Forget Notifications
    // Payyer
    setTimeout(() => {
      sendNotification(
        payerId,
        "expense_added",
        `You recorded an expense: ${description} ($${amount / 100.0})`
      ).catch((err) => console.error("Error sending notification:", err));
    }, 0);

    
    for (let i = 0; i < involvedUserIds.length; i++) {  
      const memberId = involvedUserIds[i];

      setTimeout(() => {
        sendNotification(
          memberId,
          "expense_added",
          `An expense involving you was added: ${description} ($${amount / 100.0})`
        ).catch((err) => console.error("Error sending notification:", err));
      }, 0);
    } 
  }
  else {
    console.error(`Failed to process expense with groupId=${groupId}, payerId=${payerId}, amount=${amount}`)
  }
    

    return expense;
};

export const getGroupExpenses = async (groupId: string) => {
  return await db.query.expenses.findMany({
    where: eq(expenses.groupId, groupId),
    columns: {
      id: true,
      payerId: true,
      description: true,
      amount: true,
      createdAt: true,
    },
  });
};

// genertes presigned url with 1h expiration time
export const generatePresignedUrlForBatchUpload = async (groupId: string) => {
  const fileId = crypto.randomUUID();
  const fileKey = `groups/${groupId}/expenses/batch/pre/${fileId}.csv`;

  const presignedUrl = await generatePresignedUrl(fileKey);

  return {
    fileId,
    presignedUrl: presignedUrl
  };
};

export const processExpenseFromS3 = async (groupId: string, fileId: string) => {
  const tempFilePath = path.join(__dirname, `../../temp-${Date.now()}.csv`);

  try {
    const fileKey = `groups/${groupId}/expenses/batch/pre/${fileId}.csv`
    
    // Download File from S3
    await downloadFileFromS3(process.env.S3_BUCKET_NAME!, fileKey, tempFilePath);

    // Process the CSV File
    const result = await processExpenseCSV(groupId, tempFilePath);

    return { message: "File processed successfully", result };
  } catch (error) {
    console.error("Error processing file from S3:", error);
    throw new Error("Failed to process the file");
  } finally {
    // Always delete the temporary file, regardless of success or failure
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log(`Temporary file deleted: ${tempFilePath}`);
    }
  }
};

export const processExpenseCSV = async (groupId: string, filePath: string) => {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, "utf8");
    console.log("File content:\n" + fileContent)
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,  // Ensures no leading/trailing spaces
      relax_column_count: true, // Avoids column mismatch errors
    });

    let processedCount = 0;

    for (const record of records) {
      const { payerId, description, amount, involvedUserIds } = record;

      // Validate required fields
      if (!payerId || !description || isNaN(parseInt(amount, 10)) || !involvedUserIds) {
        console.warn("Skipping invalid row:", record);
        continue;
      }

      const amountCents = parseInt(amount, 10);
      const involvedUserIdsArray = involvedUserIds.split(",").map((id: string) => id.trim());

      try {
        // Call `recordExpense` for each valid row
        await recordExpense(groupId, payerId, description, amountCents, involvedUserIdsArray);
        processedCount++;
      } catch (error) {
        console.error(`Failed to process expense: ${description}`, error);
      }
    }

    return { message: "CSV processed successfully", processed: processedCount };
  } catch (error) {
    console.error("Error processing CSV:", error);
    throw new Error("Failed to process CSV file");
  } finally {
    // Always delete the file after processing
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Error deleting file: ${filePath}`, err);
      else console.log(`File deleted: ${filePath}`);
    });
  }
};


