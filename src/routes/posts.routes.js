const express = require("express");
const rateLimit = require("express-rate-limit");

const authenticate = require("../middleware/authenticate");
const { listPosts, createPost, deletePost, addReply, maxPostLength } = require("../services/postStore");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const university = String(req.query.university || "").trim();
    const posts = await listPosts({ university: university || undefined });
    return res.status(200).json({ posts });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/",
  authenticate,
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many posts. Please try again in a minute." }
  }),
  async (req, res, next) => {
    try {
      const text = req.body.text;
      const location = req.body.location;
      const category = req.body.category;
      const anonymous = req.body.anonymous || false;

      const post = await createPost({
        text,
        location,
        category,
        anonymous,
        university: req.user.university || 'General',
        author: req.user
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("post:created", post);
        io.emit("receive_new_post", post);
      }

      return res.status(201).json({ post });
    } catch (error) {
      return next(error);
    }
  }
);

router.get("/validation", (_req, res) => {
  return res.status(200).json({
    rules: {
      textRequired: true,
      textMaxLength: maxPostLength
    }
  });
});

router.post("/:postId/reply", authenticate, async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const text = req.body.text;
    const anonymous = req.body.anonymous || false;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Reply text is required." });
    }

    const updatedPost = await addReply(postId, {
      text: text.trim(),
      author: req.user,
      anonymous
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("post:reply", { postId, reply: updatedPost.replies[updatedPost.replies.length - 1] });
    }

    return res.status(201).json({ post: updatedPost });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:postId", authenticate, async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    await deletePost(postId, userId);

    const io = req.app.get("io");
    if (io) {
      io.emit("post:deleted", { postId, userId });
    }

    return res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
