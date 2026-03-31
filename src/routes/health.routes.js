const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const dbStateByCode = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

router.get("/", (_req, res) => {
  const dbStateCode = mongoose.connection.readyState;
  const dbState = dbStateByCode[dbStateCode] || "unknown";

  res.status(200).json({
    status: "ok",
    database: dbState,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime())
  });
});

module.exports = router;
