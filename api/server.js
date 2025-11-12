// api/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import compression from "compression";

// Import centralized config - fix the path
import config from "../src/config/config.js";

// Import routes - fix the path
import { authRoutes } from "../src/routes/auth.js";

// Import middleware - fix the paths
import { securityHeaders, authLimiter, apiLimiter } from "../src/middleware/security.js";
import errorHandler from "../src/middleware/errorHandler.js";
import logger from "../src/utils/logger.js";

// Import logging middleware - fix the path
import securityLogger from "../src/middleware/securityLogger.js";

// Import database connection - fix the path
import { connectDB } from "../src/config/database.js";

const app = express();

// Environment detection
const isVercel = process.env.VERCEL;
const isDevelopment = config.env === 'development';

// CORS configuration - UPDATE THIS to allow localhost
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      // Add your production domains here
      ...(config.cors?.allowedOrigins || [])
    ];

    // In development, allow all localhost origins
    if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS policy violation attempt', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  maxAge: 86400,
};

// Middleware setup
app.set("trust proxy", 1);

// Security first
app.use(securityHeaders);
app.use(securityLogger);

// Core middleware
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use("/api/", apiLimiter);
app.use("/api/auth", authLimiter);

// Database initialization for non-serverless environments
if (!isVercel) {
  connectDB().catch((error) => {
    logger.error('Failed to initialize database:', error);
    if (config.env === 'production') {
      process.exit(1);
    }
  });
}

// Health check endpoint
app.get("/api/health", async (req, res) => {
  const healthCheck = {
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: config.env,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
  };

  // Attempt reconnection if needed
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
      healthCheck.database = "reconnected";
    } catch (error) {
      healthCheck.database = "disconnected";
      healthCheck.databaseError = isDevelopment ? error.message : undefined;
    }
  }

  const statusCode = healthCheck.database === "disconnected" ? 503 : 200;
  res.status(statusCode).json(healthCheck);
});

// Database connection middleware for API routes
app.use(async (req, res, next) => {
  if (req.path === "/api/health") {
    return next();
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    req.dbConnected = true;
    next();
  } catch (error) {
    logger.error("Database connection failed:", {
      error: error.message,
      path: req.path,
      method: req.method
    });
    
    if (req.path.startsWith("/api/auth")) {
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable",
        error: isDevelopment ? error.message : undefined,
      });
    }
    next();
  }
});

// API Routes
app.use("/api/auth", authRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

// Error handler
app.use(errorHandler);

// ADD SERVER STARTUP CODE AT THE BOTTOM:
const PORT = config.port || 5000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 FloodWatch.ph API server running on port ${PORT}`);
  logger.info(`📊 Environment: ${config.env}`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🛠️  API base URL: http://localhost:${PORT}/api`);
});

// Process event handlers
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : reason
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack
  });
  if (!isVercel) {
    process.exit(1);
  }
});

// Remove this line since we're starting the server here:
// export default app;

export default app;