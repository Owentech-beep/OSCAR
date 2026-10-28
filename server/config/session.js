import session from "express-session";
import MongoStore from "connect-mongo";
import { env } from "./env.js";
import dns from "node:dns";

dns.setServers(["1.1.1.1"]);

export const sessionMiddleware = session({
  name: "oscar.sid",

  secret: env.SESSION_SECRET,

  resave: false,

  saveUninitialized: false,

  store: MongoStore.create({
    mongoUrl: env.MONGODB_URI,
    collectionName: "sessions",
    ttl: 60 * 60 * 8,
  }),

  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8,
  },
});