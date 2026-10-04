import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

export async function authenticateUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

  if (!user || !user.active) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return null;
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  };
}
