import "dotenv/config";
import express from "express";
import path from "node:path";
import oscarRoutes from "./routes/oscar.routes.js";
import confirmationRoutes from "./routes/confirmation.routes.js";
import leadRoutes from "./routes/lead.routes.js";
import { fileURLToPath } from "node:url";
import session from "express-session";
import leadsPageRoutes from "./routes/leads-page.routes.js";
import MongoStore from "connect-mongo";
import expressLayouts from "express-ejs-layouts";
import morgan from "morgan";
import emailRoutes from "./routes/email.routes.js";
import emailsPageRoutes from "./routes/emails-page.routes.js";
import clientRoutes from "./routes/client.routes.js";
import clientsPageRoutes from "./routes/clients-page.routes.js";
import projectRoutes from "./routes/project.routes.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";
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

app.set("view engine", "ejs");
app.set("views", path.join(rootDir, "views"));
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : 0);

app.use(securityHeaders);
app.use(globalRateLimit);
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(rootDir, "public")));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  session({
    name: "oscar.sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 8
    }),
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

// Session
app.use(
  session({
    name: "oscar.sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 8
    }),
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

// Layout must be configured before page routes
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Page routes
app.use(leadsPageRoutes);

// API routes
app.use("/api/leads", leadRoutes);
app.use("/api/oscar", oscarRoutes);
app.use("/api/confirmations", confirmationRoutes);
app.use(ensureCsrfToken);
app.use(requireCsrf);
app.use("/api/emails", emailRoutes);
app.use(emailsPageRoutes);
app.use("/api/clients", clientRoutes);
app.use(clientsPageRoutes);
app.use("/api/projects", projectRoutes);
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user ?? null;
  next();
});
app.use(projectsPageRoutes);
app.use("/api/tasks", taskRoutes);
app.use(tasksPageRoutes);
app.use("/api/meetings", meetingRoutes);
app.use(calendarPageRoutes);

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

  app.listen(env.PORT, () => {
    console.log(`OSCAR is running at ${env.APP_URL}`);
  });
}

start().catch((error) => {
  console.error("Failed to start OSCAR:", error);
  process.exit(1);
});

export default app;
