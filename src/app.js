const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const env = require("./config/env");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const utilityRoutes = require("./routes/utilities.routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

function createCorsOptions(origin) {
  if (origin === "*") {
    return { origin: true };
  }

  const allowed = origin
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || allowed.includes(requestOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Blocked by CORS policy"));
    }
  };
}

function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(compression());
  app.use(cors(createCorsOptions(env.corsOrigin)));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use("/api/v1/health", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/utilities", utilityRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
