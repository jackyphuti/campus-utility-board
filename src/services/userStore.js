const crypto = require("crypto");

const usersById = new Map();
const userIdByEmail = new Map();

function sanitize(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function findByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const userId = userIdByEmail.get(normalizedEmail);
  if (!userId) {
    return null;
  }

  return usersById.get(userId) || null;
}

function findById(userId) {
  return usersById.get(userId) || null;
}

function createUser({ name, email, passwordHash }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (userIdByEmail.has(normalizedEmail)) {
    const error = new Error("A user with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const user = {
    id: crypto.randomUUID(),
    name: String(name || "").trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  usersById.set(user.id, user);
  userIdByEmail.set(normalizedEmail, user.id);

  return sanitize(user);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  sanitize
};
