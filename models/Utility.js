const mongoose = require("mongoose");

const allowedStatuses = ["operational", "degraded", "outage", "maintenance"];

const utilitySchema = new mongoose.Schema(
  {
    utilityType: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    status: {
      type: String,
      required: true,
      enum: allowedStatuses,
      default: "operational"
    },
    message: {
      type: String,
      trim: true,
      default: "All systems normal"
    }
  },
  {
    timestamps: true
  }
);

module.exports = {
  Utility: mongoose.model("Utility", utilitySchema),
  allowedStatuses
};
