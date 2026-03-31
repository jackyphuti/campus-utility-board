const mongoose = require("mongoose");

const Post = require("../../models/Post");

const maxPostLength = 1000;

function assertMongoConnection() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error("Database is not connected.");
    error.statusCode = 503;
    throw error;
  }
}

function toPublicPost(post) {
  const displayAuthor = post.anonymous
    ? { id: "anonymous", name: "Anonymous", email: "anonymous@campus.local" }
    : post.author;

  return {
    id: String(post.id || post._id),
    text: post.text,
    location: post.location,
    category: post.category || "General",
    upvotes: Number(post.upvotes || 0),
    replyCount: Number(post.replyCount || 0),
    anonymous: Boolean(post.anonymous || false),
    university: String(post.university || "General"),
    author: displayAuthor,
    replies: (post.replies || []).map((reply) => ({
      id: String(reply.id || reply._id),
      author: reply.author?.anonymous
        ? { id: "anonymous", name: "Anonymous", email: "anonymous@campus.local" }
        : reply.author,
      text: reply.text,
      createdAt: new Date(reply.createdAt).toISOString()
    })),
    createdAt: new Date(post.createdAt).toISOString(),
    updatedAt: new Date(post.updatedAt).toISOString()
  };
}

async function listPosts({ university } = {}) {
  assertMongoConnection();
  const normalizedUniversity = String(university || "").trim();
  const query = normalizedUniversity ? { university: normalizedUniversity } : {};
  const dbPosts = await Post.find(query).sort({ createdAt: -1 }).limit(200).lean();
  return dbPosts.map(toPublicPost);
}

async function createPost({ text, location, category, author, anonymous, university }) {
  const normalizedText = String(text || "").trim();
  const normalizedLocation = String(location || "Campus General").trim() || "Campus General";
  const normalizedCategory = String(category || "General").trim() || "General";
  const isAnonymous = Boolean(anonymous || false);
  const normalizedUniversity = String(university || "General").trim() || "General";

  if (!normalizedText) {
    const error = new Error("text is required.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedText.length > maxPostLength) {
    const error = new Error(`text must be at most ${maxPostLength} characters.`);
    error.statusCode = 400;
    throw error;
  }

  if (!author || !author.id || !author.name || !author.email) {
    const error = new Error("author is required.");
    error.statusCode = 400;
    throw error;
  }

  assertMongoConnection();

  const created = await Post.create({
    text: normalizedText,
    location: normalizedLocation,
    category: normalizedCategory,
    anonymous: isAnonymous,
    university: normalizedUniversity,
    author: {
      id: String(author.id),
      name: String(author.name),
      email: String(author.email).toLowerCase()
    }
  });

  return toPublicPost(created);
}

async function addReply(postId, { text, author, anonymous }) {
  const normalizedText = String(text || "").trim();
  const isAnonymous = Boolean(anonymous || false);

  if (!postId) {
    const error = new Error("postId is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!normalizedText) {
    const error = new Error("Reply text is required.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedText.length > 500) {
    const error = new Error("Reply text must be at most 500 characters.");
    error.statusCode = 400;
    throw error;
  }

  if (!author || !author.id || !author.name || !author.email) {
    const error = new Error("author is required.");
    error.statusCode = 400;
    throw error;
  }

  assertMongoConnection();

  const reply = {
    id: new mongoose.Types.ObjectId().toString(),
    author: {
      id: String(author.id),
      name: String(author.name),
      email: String(author.email).toLowerCase(),
      anonymous: isAnonymous
    },
    text: normalizedText,
    createdAt: new Date()
  };

  const updated = await Post.findByIdAndUpdate(
    String(postId),
    {
      $push: { replies: reply },
      $inc: { replyCount: 1 }
    },
    { new: true }
  ).lean();

  if (!updated) {
    const error = new Error("Post not found.");
    error.statusCode = 404;
    throw error;
  }

  return toPublicPost(updated);
}

async function deletePost(postId, userId) {
  if (!postId) {
    const error = new Error("postId is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!userId) {
    const error = new Error("userId is required.");
    error.statusCode = 400;
    throw error;
  }

  assertMongoConnection();

  const post = await Post.findById(postId);

  if (!post) {
    const error = new Error("Post not found.");
    error.statusCode = 404;
    throw error;
  }

  if (String(post.author.id) !== String(userId)) {
    const error = new Error("You can only delete your own posts.");
    error.statusCode = 403;
    throw error;
  }

  await Post.deleteOne({ _id: postId });
  return { success: true, message: "Post deleted successfully" };
}

module.exports = {
  maxPostLength,
  listPosts,
  createPost,
  addReply,
  deletePost
};
