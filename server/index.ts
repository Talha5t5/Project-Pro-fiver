import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import cors from "cors";
import multer from "multer";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerMobileSpotEndpoints } from "./api-spots";
import { initDB } from "./db";
import { sendUpcomingJobReminders, processPlanRenewalReminders } from "./services/notifications";

const app = express();

// Enable CORS for mobile app
app.use(cors({
  origin: [
    'http://localhost', 
    'http://localhost:3000', 
    'http://192.168.100.183:3000',
    'http://10.103.181.15:3000',
    'capacitor://localhost', 
    'ionic://localhost',
    'http://localhost:8100',
    'http://localhost:4200',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:4173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests specifically for mobile
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(204).end();
});

// Configure JSON parsing with special handling for Stripe webhooks
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Configure multer for handling multipart/form-data
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Add multer middleware for multipart/form-data
app.use(upload.any());

// Setup session middleware
const SessionStore = MemoryStore(session);
app.use(session({
  secret: process.env.SESSION_SECRET || "artisan-project-manager-secret-key",
  resave: false,
  saveUninitialized: false,
  store: new SessionStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: { 
    secure: false, // Allow HTTP for mobile app development
    httpOnly: true,
    sameSite: 'lax', // Allow cross-origin requests from mobile app
    maxAge: 86400000 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database
  await initDB();
  
  // Registra l'endpoint dedicato per gli spot promozionali mobile
  registerMobileSpotEndpoints(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 3000
  // this serves both the API and the client.
  const port = process.env.PORT || 3000;
  server.listen({
    port: Number(port),
    host: process.env.HOST || "0.0.0.0", // Listen on all network interfaces for mobile app
  }, () => {
    log(`serving on port ${port} on all network interfaces`);
  });

  // Simple in-process scheduler for job reminders (every 15 minutes)
  setInterval(() => {
    sendUpcomingJobReminders().catch((e) => log(`reminder job failed: ${String(e)}`, "notifications"));
  }, 15 * 60 * 1000);

  // Plan renewal reminders once per day
  setInterval(() => {
    processPlanRenewalReminders(7).catch((e) => log(`renewal reminders failed: ${String(e)}`, "notifications"));
  }, 24 * 60 * 60 * 1000);
})();
