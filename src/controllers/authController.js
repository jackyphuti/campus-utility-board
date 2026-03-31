const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const { passport } = require("../config/passport");
const { isAllowedCampusEmail } = require("../config/universityDomains");
const { createUser, findByEmail, sanitize } = require("../services/userStore");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinLength = 8;
const allowedYears = ["1st", "2nd", "3rd", "4th", "postgrad", "1st Year", "2nd Year", "3rd Year", "4th Year", "Postgrad"];

function generateToken(user) {
  const userId = String(user.id || user._id);

  return jwt.sign({ email: user.email }, env.jwtSecret, {
    subject: userId,
    expiresIn: env.jwtExpiresIn
  });
}

function oauthEnabled(app, provider) {
  const configured = app.get("oauthProviders") || {};
  return Boolean(configured[provider]);
}

function buildFrontendAuthRedirect(params) {
  const url = new URL("/login", env.frontendUrl);
  const entries = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== "");

  for (const [key, value] of entries) {
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function findOrCreateOauthUser({ email, name, provider }) {
  const existing = await findByEmail(email);
  if (existing) {
    return sanitize(existing);
  }

  const randomPassword = crypto.randomBytes(24).toString("hex");
  const passwordHash = await bcrypt.hash(randomPassword, 12);

  return createUser({
    name,
    email,
    passwordHash,
    university: "Campus Verified",
    degree: "Not specified",
    yearOfStudy: "1st Year",
    campus: provider
  });
}

async function registerUser(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const university = String(req.body.university || "").trim();
    const studentId = String(req.body.studentId || "").trim();
    const degree = String(req.body.degree || "").trim();
    const yearOfStudy = String(req.body.yearOfStudy || "").trim();
    const campus = String(req.body.campus || "").trim();

    if (!name || !email || !password || !university || !degree || !yearOfStudy) {
      return res.status(400).json({ message: "name, email, password, university, degree, and yearOfStudy are required." });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    if (!isAllowedCampusEmail(email)) {
      return res.status(400).json({ message: "Campus emails only." });
    }

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: "name must be between 2 and 80 characters." });
    }

    if (password.length < passwordMinLength) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    if (!allowedYears.includes(yearOfStudy)) {
      return res.status(400).json({ message: "yearOfStudy must be one of: 1st, 2nd, 3rd, 4th, postgrad, 1st Year, 2nd Year, 3rd Year, 4th Year, Postgrad." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await createUser({
      name,
      email,
      passwordHash,
      university,
      studentId: studentId || undefined,
      degree,
      yearOfStudy,
      campus: campus || undefined
    });

    const token = generateToken(user);

    return res.status(201).json({ user, token });
  } catch (error) {
    return next(error);
  }
}

async function loginUser(req, res, next) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    const user = await findByEmail(email);

    if (!user) {
      return res.status(404).json({
        message: "User does not exist. Please create a new account."
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid credentials. Please check your password."
      });
    }

    const token = generateToken(user);

    return res.status(200).json({ user: sanitize(user), token });
  } catch (error) {
    return next(error);
  }
}

function meUser(req, res) {
  return res.status(200).json({ user: req.user });
}

function getProviders(req, res) {
  return res.status(200).json({
    providers: {
      google: oauthEnabled(req.app, "google"),
      microsoft: oauthEnabled(req.app, "microsoft")
    }
  });
}

function startGoogleAuth(req, res, next) {
  if (!oauthEnabled(req.app, "google")) {
    return res.status(501).json({ message: "Google SSO is not configured on this server." });
  }

  return passport.authenticate("google", { session: false, scope: ["profile", "email"] })(req, res, next);
}

function handleGoogleCallback(req, res, next) {
  if (!oauthEnabled(req.app, "google")) {
    return res.status(501).json({ message: "Google SSO is not configured on this server." });
  }

  return passport.authenticate("google", { session: false }, async (error, oauthUser, info) => {
    if (error) {
      return next(error);
    }

    if (!oauthUser) {
      return res.redirect(buildFrontendAuthRedirect({ error: info?.message || "Campus emails only." }));
    }

    try {
      if (!isAllowedCampusEmail(oauthUser.email)) {
        return res.redirect(buildFrontendAuthRedirect({ error: "Campus emails only." }));
      }

      const user = await findOrCreateOauthUser(oauthUser);
      const token = generateToken(user);

      return res.redirect(buildFrontendAuthRedirect({ token }));
    } catch (callbackError) {
      return next(callbackError);
    }
  })(req, res, next);
}

function startMicrosoftAuth(req, res, next) {
  if (!oauthEnabled(req.app, "microsoft")) {
    return res.status(501).json({ message: "Microsoft SSO is not configured on this server." });
  }

  return passport.authenticate("microsoft", { session: false })(req, res, next);
}

function handleMicrosoftCallback(req, res, next) {
  if (!oauthEnabled(req.app, "microsoft")) {
    return res.status(501).json({ message: "Microsoft SSO is not configured on this server." });
  }

  return passport.authenticate("microsoft", { session: false }, async (error, oauthUser, info) => {
    if (error) {
      return next(error);
    }

    if (!oauthUser) {
      return res.redirect(buildFrontendAuthRedirect({ error: info?.message || "Campus emails only." }));
    }

    try {
      if (!isAllowedCampusEmail(oauthUser.email)) {
        return res.redirect(buildFrontendAuthRedirect({ error: "Campus emails only." }));
      }

      const user = await findOrCreateOauthUser(oauthUser);
      const token = generateToken(user);

      return res.redirect(buildFrontendAuthRedirect({ token }));
    } catch (callbackError) {
      return next(callbackError);
    }
  })(req, res, next);
}

module.exports = {
  registerUser,
  loginUser,
  meUser,
  getProviders,
  startGoogleAuth,
  handleGoogleCallback,
  startMicrosoftAuth,
  handleMicrosoftCallback
};
