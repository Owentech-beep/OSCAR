import "dotenv/config";
import mongoose from "mongoose";
import { User } from "./models/User.js";
import express from "express";
import path from "node:path";
import oscarRoutes from "./routes/oscar.routes.js";
import confirmationRoutes from "./routes/confirmation.routes.js";
import leadRoutes from "./routes/lead.routes.js";
import { fileURLToPath } from "node:url";
import leadsPageRoutes from "./routes/leads-page.routes.js";
import { sessionMiddleware } from "./config/session.js";
import expressLayouts from "express-ejs-layouts";
import morgan from "morgan";
import emailRoutes from "./routes/email.routes.js";
import emailsPageRoutes from "./routes/emails-page.routes.js";
import invoicesPageRoutes from "./routes/invoices-page.routes.js";
import clientRoutes from "./routes/client.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import clientsPageRoutes from "./routes/clients-page.routes.js";
import projectRoutes from "./routes/project.routes.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { securityHeaders, globalRateLimit } from "./middleware/security.js";
import { ensureCsrfToken, requireCsrf } from "./middleware/csrf.js";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import projectsPageRoutes from "./routes/projects-page.routes.js";
import taskRoutes from "./routes/task.routes.js";
import tasksPageRoutes from "./routes/tasks-page.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import calendarPageRoutes from "./routes/calendar-page.routes.js";
import { getBrainAssets } from "./utils/brain-assets.js";
import {
  startEmailScheduler,
  stopEmailScheduler,
} from "./services/email-scheduler.service.js";
import http from "node:http";
import { Server } from "socket.io";
import {
  initializeOscarSocket,
  shutdownOscarSocket,
} from "./services/oscar-socket.service.js";
import settingsPageRoutes from "./routes/settings-page.routes.js";
import analyticsPageRoutes from "./routes/analytics-page.routes.js";
import documentsRoutes from "./routes/documents.routes.js";

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:");
  console.error(reason);
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:");
  console.error(error);
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.APP_URL,
    credentials: true,
  },
});

io.engine.use(sessionMiddleware);

io.use(async (socket, next) => {
  try {
    const userId = socket.request.session?.user?.id;

    if (
      typeof userId !== "string" ||
      !mongoose.isValidObjectId(userId)
    ) {
      return next(new Error("Authentication required."));
    }

    const account = await User.findById(userId)
      .select("_id role active")
      .lean();

    if (
      !account ||
      account.active !== true ||
      !["owner", "admin", "staff"].includes(account.role)
    ) {
      return next(new Error("Your account cannot access OSCAR."));
    }

    socket.data.principal = {
      userId: account._id.toString(),
      role: account.role,
    };

    return next();
  } catch (error) {
    console.error("OSCAR socket account verification failed:", error);
    return next(new Error("Unable to verify your account."));
  }
});

initializeOscarSocket(io);

io.on("connection", (socket) => {
  const { userId } = socket.data.principal;

  socket.join(`user:${userId}`);

  console.log(
    `OSCAR Socket connected: ${socket.id} → user:${userId}`,
  );

  socket.on("disconnect", (reason) => {
    console.log(
      `OSCAR Socket disconnected: ${socket.id} → ${reason}`,
    );
  });
});

initializeOscarSocket(io);

io.on("connection", (socket) => {
  const user = socket.request.session?.user;

  if (!user) {
    console.log(
      `OSCAR Socket rejected: ${socket.id} → no authenticated session`,
    );
    socket.disconnect(true);
    return;
  }

  const userId = user.id;

  socket.join(`user:${userId}`);

  console.log(`OSCAR Socket connected: ${socket.id} → user:${userId}`);

  socket.on("disconnect", (reason) => {
    console.log(`OSCAR Socket disconnected: ${socket.id} → ${reason}`);
  });
});

app.set("view engine", "ejs");
app.set("views", path.join(rootDir, "views"));
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : 0);

app.use(securityHeaders);

// Deployment health check: no login or session required.
app.get("/healthz", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;

  res.setHeader("Cache-Control", "no-store");

  return res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
  });
});

app.use(globalRateLimit);
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(rootDir, "public")));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

//Middleware session
app.use(sessionMiddleware);

// Generate a CSRF token for the current session before rendering pages.
app.use(ensureCsrfToken);

// EJS locals
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user ?? null;
  res.locals.brainAssets = getBrainAssets();
  next();
});

// Layout must be configured before page routes.
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Enforce CSRF protection before application routes.
app.use(requireCsrf);

// Page routes
app.use(leadsPageRoutes);
// API routes
app.use("/api/leads", leadRoutes);
app.use("/api/oscar", oscarRoutes);
app.use("/api/confirmations", confirmationRoutes);

app.use("/api/emails", emailRoutes);
app.use(emailsPageRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use(clientsPageRoutes);
app.use(invoicesPageRoutes);
app.use("/api/projects", projectRoutes);
app.use(projectsPageRoutes);
app.use("/api/tasks", taskRoutes);
app.use(tasksPageRoutes);
app.use("/api/meetings", meetingRoutes);
app.use(calendarPageRoutes);
app.use(settingsPageRoutes);
app.use(analyticsPageRoutes);
app.use(documentsRoutes);

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  return res.redirect("/login");
});

app.use(authRoutes);
app.use(dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDatabase();

  startEmailScheduler();

  httpServer.listen(env.PORT, () => {
    console.log(`OSCAR is running at ${env.APP_URL}`);
  });
}

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(`${signal} received. Shutting down OSCAR...`);

  stopEmailScheduler();
  shutdownOscarSocket();

  let shutdownFailed = false;

  try {
    console.log("Closing HTTP server...");

    const serverClosed = new Promise((resolve, reject) => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
        } else {
          console.log("HTTP server closed.");
          resolve();
        }
      });
    });

    httpServer.closeAllConnections();

    await serverClosed;
  } catch (error) {
    shutdownFailed = true;
    console.error("Error closing HTTP server:", error);
  }

  try {
    await disconnectDatabase();
  } catch (error) {
    shutdownFailed = true;
    console.error("Error disconnecting MongoDB:", error);
  }

  if (shutdownFailed) {
    console.error("OSCAR shut down with errors.");
    process.exitCode = 1;
  } else {
    console.log("OSCAR shut down cleanly.");
    process.exitCode = 0;
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  console.error("Failed to start OSCAR:", error);
  process.exit(1);
});

export default app;
