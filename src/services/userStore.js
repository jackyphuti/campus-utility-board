const mongoose = require("mongoose");

const User = require("../../models/User");

function assertMongoConnection() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error("Database is not connected.");
    error.statusCode = 503;
    throw error;
  }
}

function sanitize(user) {
  const id = String(user.id || user._id);

  return {
    id,
    name: user.name,
    email: user.email,
    university: user.university || null,
    studentId: user.studentId || null,
    degree: user.degree || null,
    yearOfStudy: user.yearOfStudy || null,
    campus: user.campus || null,
    createdAt: new Date(user.createdAt).toISOString()
  };
}

async function findByEmail(email) {
  assertMongoConnection();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return User.findOne({ email: normalizedEmail }).lean();
}

async function findById(userId) {
  assertMongoConnection();
  return User.findById(String(userId)).lean();
}

async function createUser({ name, email, passwordHash, university, studentId, degree, yearOfStudy, campus }) {
  assertMongoConnection();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  try {
    const created = await User.create({
      name: String(name || "").trim(),
      email: normalizedEmail,
      passwordHash,
      university: university || undefined,
      studentId: studentId || undefined,
      degree: degree || undefined,
      yearOfStudy: yearOfStudy || undefined,
      campus: campus || undefined
    });

    return sanitize(created);
  } catch (error) {
    if (error && error.code === 11000) {
      const duplicate = new Error("A user with this email already exists.");
      duplicate.statusCode = 409;
      throw duplicate;
    }

    throw error;
  }
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  sanitize
};
