import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { User } from "../models/User.js";

const rl = readline.createInterface({ input, output });

try {
  await connectDatabase();

  const email = (
    await rl.question("Test staff email: ")
  ).trim().toLowerCase();

  const password = await rl.question("Test staff password: ");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }

  const existing = await User.findOne({ email });

  if (existing) {
    throw new Error(
      "That email already belongs to an account. Nothing was changed.",
    );
  }

  await User.create({
    name: "OSCAR Test Staff",
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "staff",
    active: true,
  });

  console.log(`Created test staff account: ${email}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await disconnectDatabase();
}