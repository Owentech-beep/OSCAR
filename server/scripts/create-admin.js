import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { User } from "../models/User.js";

const rl = readline.createInterface({ input, output });

try {
  await connectDatabase();

  const name = await rl.question("Owner name: ");
  const email = await rl.question("Owner email: ");
  const password = await rl.question("Password: ");

  if (!name.trim() || !email.trim() || password.length < 12) {
    throw new Error("Name/email are required and password must be at least 12 characters.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    throw new Error("A user with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "owner",
    active: true
  });

  console.log(`Created OSCAR owner account for ${normalizedEmail}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await disconnectDatabase();
}
