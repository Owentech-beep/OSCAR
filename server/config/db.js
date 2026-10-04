import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

dns.setServers(["1.1.1.1"]);

export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}