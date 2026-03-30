const allowedStatuses = new Set(["operational", "degraded", "outage", "maintenance"]);

const utilityBoard = {
  electricity: {
    utilityType: "electricity",
    status: "operational",
    message: "All systems normal",
    updatedAt: new Date().toISOString()
  },
  water: {
    utilityType: "water",
    status: "operational",
    message: "All systems normal",
    updatedAt: new Date().toISOString()
  },
  internet: {
    utilityType: "internet",
    status: "operational",
    message: "All systems normal",
    updatedAt: new Date().toISOString()
  }
};

function getAllUtilities() {
  return Object.values(utilityBoard);
}

function getUtility(utilityType) {
  return utilityBoard[utilityType] || null;
}

function updateUtility(utilityType, { status, message }) {
  const utility = utilityBoard[utilityType];

  if (!utility) {
    const error = new Error("Unknown utility type.");
    error.statusCode = 404;
    throw error;
  }

  if (!allowedStatuses.has(status)) {
    const error = new Error("Invalid status. Allowed values: operational, degraded, outage, maintenance.");
    error.statusCode = 400;
    throw error;
  }

  utility.status = status;
  utility.message = String(message || "").trim() || "Status updated";
  utility.updatedAt = new Date().toISOString();

  return { ...utility };
}

module.exports = {
  allowedStatuses,
  getAllUtilities,
  getUtility,
  updateUtility
};
