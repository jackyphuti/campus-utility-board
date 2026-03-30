const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const authenticate = require("../middleware/authenticate");
const { createUser, findByEmail, sanitize } = require("../services/userStore");

const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinLength = 8;
// Constant hash used to reduce user-enumeration timing differences on login.
const unknownUserPasswordHash = "$2a$12$MCMjM1f42C3Lzc8M8kQ8supB6fQtbDNRsTA70vsK1tnE.bBZ5YQ4q";

function createToken(user) {
  return jwt.sign({ email: user.email }, env.jwtSecret, {
    subject: user.id,
    expiresIn: env.jwtExpiresIn
  });
}

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required." });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: "name must be between 2 and 80 characters." });
    }

    if (password.length < passwordMinLength) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = createUser({ name, email, passwordHash });

    const token = createToken(user);

    return res.status(201).json({ user, token });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    const user = findByEmail(email);

    if (!user) {
      await bcrypt.compare(password, unknownUserPasswordHash);
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = createToken(user);

    return res.status(200).json({ user: sanitize(user), token });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authenticate, (req, res) => {
  return res.status(200).json({ user: req.user });
});

module.exports = router;
