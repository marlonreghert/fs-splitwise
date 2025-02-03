import { db } from "../db/db";
import { users } from "../db/schema/users";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config();
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to fetch user email by ID
const getUserEmailById = async (userId: string): Promise<string | null> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true },
  });

  return user?.email || null;
};


// Use the transporter directly
const sendEmail = async (to: string, subject: string, message: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"FS Splitwise" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: message,
    });

    console.log(`Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};

// Function to send notification (fetch email & send)
export const sendNotification = async (
  userId: string,
  type: "expense_added" | "debt_settled",
  message: string
) => {
  try {
    // Fetch user email from database
    const userEmail = await getUserEmailById(userId);
    
    if (!userEmail) {
      console.error(`No email found for User(${userId})`);
      return;
    }

    console.log(`Sending email to User(${userEmail}): ${message}`);

    // Send the email
    const subject = type === "expense_added" 
      ? "New Expense Recorded" 
      : "Debt Settlement Update";

    await sendEmail(userEmail, subject, message);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};
