const dotenv = require("dotenv");

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGIN || "*",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h"
};

if (!env.jwtSecret) {
  if (env.nodeEnv === "production") {
    throw new Error("JWT_SECRET must be set in production.");
  }

  env.jwtSecret = "dev_only_secret_change_me_1234567890";
}

if (env.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long.");
}

module.exports = env;
