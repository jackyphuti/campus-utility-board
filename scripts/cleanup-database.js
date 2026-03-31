#!/usr/bin/env node
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

async function cleanupDatabase() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // List of collections to clear
    const collectionsToDelete = ["posts", "users", "studygroups", "labs"];

    for (const collectionName of collectionsToDelete) {
      const collection = mongoose.connection.collection(collectionName);
      const result = await collection.deleteMany({});
      console.log(`✅ Cleared ${collectionName}: deleted ${result.deletedCount} documents`);
    }

    // Keep utilities with their defaults (they will auto-create on next API call)
    const utilitiesCollection = mongoose.connection.collection("utilities");
    const utilitiesDeleted = await utilitiesCollection.deleteMany({});
    console.log(`✅ Cleared utilities: deleted ${utilitiesDeleted.deletedCount} documents (will recreate defaults on next health check)`);

    console.log("\n✅ Database cleanup complete! ✨");
    console.log("📝 The board is now clean for production.\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanupDatabase();
