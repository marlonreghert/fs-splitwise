// Declare the mock first
const mockSendMail = jest.fn();

// Mock nodemailer
jest.mock("nodemailer", () => {
  const actualNodemailer = jest.requireActual("nodemailer"); // Keep the actual Nodemailer behavior
  return {
    ...actualNodemailer,
    createTransport: jest.fn(() => ({
      sendMail: mockSendMail,
    })),
  };
});

// Mock the database
jest.mock("../../src/db/db", () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
  },
}));


import { sendNotification } from "../../src/services/notificationService";
import { db } from "../../src/db/db";



describe("Notification Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should send an email when user email is found", async () => {
    const mockUser = { email: "test@example.com" };
    (db.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
    mockSendMail.mockResolvedValue({ messageId: "12345" });

    await sendNotification("user-id", "expense_added", "Test message");

    expect(db.query.users.findFirst).toHaveBeenCalledWith({
      where: expect.anything(),
      columns: { email: true },
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: expect.stringContaining("FS Splitwise"),
      to: "test@example.com",
      subject: "New Expense Recorded",
      text: "Test message",
    });
  });

  it("should log an error if user email is not found", async () => {
    (db.query.users.findFirst as jest.Mock).mockResolvedValue(null);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await sendNotification("user-id", "expense_added", "Test message");

    expect(consoleSpy).toHaveBeenCalledWith("No email found for User(user-id)");
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("should handle errors when sending email fails", async () => {
    const mockUser = { email: "test@example.com" };
    (db.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
    mockSendMail.mockRejectedValue(new Error("SMTP error"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await sendNotification("user-id", "expense_added", "Test message");

    expect(consoleSpy).toHaveBeenCalledWith("Failed to send notification:", expect.any(Error));
  });
});
