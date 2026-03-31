const mongoose = require("mongoose");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set.");
  }

  const maxRetries = parsePositiveInt(process.env.MONGO_CONNECT_RETRIES, 5);
  const retryDelayMs = parsePositiveInt(process.env.MONGO_CONNECT_RETRY_DELAY_MS, 3000);

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`[+] MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      console.error(`[!] MongoDB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      if (isLastAttempt) {
        console.error("[!] Could not connect to MongoDB after maximum retries.");
        process.exit(1);
      }

      console.log(`[~] Retrying MongoDB connection in ${retryDelayMs}ms...`);
      await sleep(retryDelayMs);
    }
  }
};

module.exports = connectDB;
