const jwt = require("jsonwebtoken");

const env = require("../config/env");
const { findById, sanitize } = require("../services/userStore");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header." });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      clockTolerance: 5
    });

    if (!payload || typeof payload.sub !== "string" || !payload.sub) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    const user = findById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Invalid token user." });
    }

    req.user = sanitize(user);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = authenticate;
