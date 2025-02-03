import { db } from "../db/db";
import { users } from "../db/schema/users";

export const createUser = async (name: string, email: string) => {
  // Insert the new user
  const [user] = await db.insert(users)
    .values({ name, email })
    .returning();

  return user;
};

// Fetch all users
export const getAllUsers = async () => {
  return await db.query.users.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
};