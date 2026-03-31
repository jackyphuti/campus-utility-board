const mongoose = require("mongoose");

// Reply schema for nested replies
const replySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  author: {
    id: String,
    name: String,
    email: String,
    anonymous: Boolean
  },
  text: {
    type: String,
    required: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Please add some text to your post"],
      trim: true,
      maxlength: 1000
    },
    location: {
      type: String,
      default: "Campus General",
      trim: true
    },
    category: {
      type: String,
      trim: true,
      enum: ["Lost & Found", "Marketplace", "Ride Share", "Complaints", "General"],
      default: "General"
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0
    },
    anonymous: {
      type: Boolean,
      default: false
    },
    university: {
      type: String,
      required: [true, "Please add a university for this post"],
      default: "General",
      trim: true
    },
    author: {
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      }
    },
    replies: [replySchema]
  },
  {
    timestamps: true
  }
);

postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
