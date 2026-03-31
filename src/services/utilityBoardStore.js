const mongoose = require("mongoose");

const { Utility, allowedStatuses: allowedStatusesArray } = require("../../models/Utility");

const allowedStatuses = new Set(allowedStatusesArray);

const defaultUtilities = [
  {
    utilityType: "electricity",
    status: "operational",
    message: "All systems normal"
  },
  {
    utilityType: "water",
    status: "operational",
    message: "All systems normal"
  },
  {
    utilityType: "internet",
    status: "operational",
    message: "All systems normal"
  }
];

function assertMongoConnection() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error("Database is not connected.");
    error.statusCode = 503;
    throw error;
  }
}

function toPublicUtility(utility) {
  return {
    utilityType: utility.utilityType,
    status: utility.status,
    message: utility.message,
    updatedAt: new Date(utility.updatedAt).toISOString()
  };
}

async function ensureDefaultsInDb() {
  assertMongoConnection();

  const existingCount = await Utility.estimatedDocumentCount();
  if (existingCount > 0) {
    return;
  }

  await Utility.insertMany(defaultUtilities, { ordered: false });
}

async function getAllUtilities() {
  assertMongoConnection();
  await ensureDefaultsInDb();
  const utilities = await Utility.find({}).sort({ utilityType: 1 }).lean();
  return utilities.map(toPublicUtility);
}

async function getUtility(utilityType) {
  assertMongoConnection();
  const normalizedType = String(utilityType || "").trim().toLowerCase();
  await ensureDefaultsInDb();
  const utility = await Utility.findOne({ utilityType: normalizedType }).lean();
  return utility ? toPublicUtility(utility) : null;
}

async function updateUtility(utilityType, { status, message }) {
  assertMongoConnection();
  const normalizedType = String(utilityType || "").trim().toLowerCase();

  await ensureDefaultsInDb();

  const updated = await Utility.findOneAndUpdate(
    { utilityType: normalizedType },
    {
      status,
      message: String(message || "").trim() || "Status updated"
    },
    { returnDocument: "after", runValidators: true }
  ).lean();

  if (!updated) {
    const notFoundError = new Error("Unknown utility type.");
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  return toPublicUtility(updated);
}

module.exports = {
  allowedStatuses,
  getAllUtilities,
  getUtility,
  updateUtility
};
