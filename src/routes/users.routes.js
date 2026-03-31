const express = require('express');

const authenticate = require('../middleware/authenticate');
const { findById } = require('../services/userStore');
const Post = require('../../models/Post');

const router = express.Router();

router.get('/:userId/public-profile', authenticate, async (req, res, next) => {
  try {
    const userId = String(req.params.userId || '').trim();

    if (!userId) {
      return res.status(400).json({ message: 'userId is required.' });
    }

    const user = await findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const allUserPosts = await Post.find({ 'author.id': String(userId) }).sort({ createdAt: -1 }).lean();
    const publicPosts = allUserPosts.filter((post) => !post.anonymous);
    const totalUpvotes = allUserPosts.reduce((sum, post) => sum + Number(post.upvotes || 0), 0);
    const totalReplies = allUserPosts.reduce((sum, post) => sum + Number(post.replyCount || 0), 0);

    const recentPosts = publicPosts.slice(0, 10).map((post) => ({
      id: String(post._id),
      text: post.text,
      location: post.location,
      category: post.category || 'General',
      upvotes: Number(post.upvotes || 0),
      replyCount: Number(post.replyCount || 0),
      createdAt: post.createdAt,
    }));

    return res.status(200).json({
      profile: {
        id: String(user._id || user.id),
        name: user.name,
        university: user.university || null,
        degree: user.degree || null,
        yearOfStudy: user.yearOfStudy || null,
        campus: user.campus || null,
        createdAt: user.createdAt,
      },
      stats: {
        posts: allUserPosts.length,
        upvotes: totalUpvotes,
        replies: totalReplies,
      },
      recentPosts,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
