const express = require("express");

const authenticate = require("../middleware/authenticate");
const {
  registerUser,
  loginUser,
  meUser,
  getProviders,
  startGoogleAuth,
  handleGoogleCallback,
  startMicrosoftAuth,
  handleMicrosoftCallback
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authenticate, meUser);
router.get("/providers", getProviders);
router.get("/google", startGoogleAuth);
router.get("/google/callback", handleGoogleCallback);
router.get("/microsoft", startMicrosoftAuth);
router.get("/microsoft/callback", handleMicrosoftCallback);

module.exports = router;
