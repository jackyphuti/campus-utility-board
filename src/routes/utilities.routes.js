const express = require("express");

const authenticate = require("../middleware/authenticate");
const {
  allowedStatuses,
  getAllUtilities,
  getUtility,
  updateUtility
} = require("../services/utilityBoardStore");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const utilities = await getAllUtilities();
    return res.status(200).json({ utilities });
  } catch (error) {
    return next(error);
  }
});

router.get("/:utilityType", async (req, res, next) => {
  try {
    const utilityType = String(req.params.utilityType || "").trim().toLowerCase();
    const utility = await getUtility(utilityType);

    if (!utility) {
      return res.status(404).json({ message: "Utility not found." });
    }

    return res.status(200).json({ utility });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:utilityType", authenticate, async (req, res, next) => {
  try {
    const utilityType = String(req.params.utilityType || "").trim().toLowerCase();
    const status = String(req.body.status || "").trim().toLowerCase();
    const message = String(req.body.message || "").trim();

    if (!status) {
      return res.status(400).json({ message: "status is required." });
    }

    if (!allowedStatuses.has(status)) {
      return res.status(400).json({
        message: "Invalid status value.",
        allowedStatuses: Array.from(allowedStatuses)
      });
    }

    const updatedUtility = await updateUtility(utilityType, { status, message });

    const io = req.app.get("io");
    if (io) {
      io.emit("utility:updated", updatedUtility);
    }

    return res.status(200).json({ utility: updatedUtility });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
