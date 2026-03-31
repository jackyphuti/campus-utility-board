const mongoose = require('mongoose');

const StudyGroupSchema = new mongoose.Schema(
  {
    university: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    module: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}\d{3}$/,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 2,
      max: 20,
      default: 5,
    },
    currentMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    maxMembers: {
      type: Number,
      min: 2,
      max: 20,
      default: 8,
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        userName: String,
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    description: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

StudyGroupSchema.pre('validate', function syncBlueprintFields(next) {
  if (!this.creator && this.createdBy) {
    this.creator = this.createdBy;
  }

  if (!this.createdBy && this.creator) {
    this.createdBy = this.creator;
  }

  if (!this.capacity && this.maxMembers) {
    this.capacity = this.maxMembers;
  }

  if (!this.maxMembers && this.capacity) {
    this.maxMembers = this.capacity;
  }

  if ((!this.currentMembers || this.currentMembers.length === 0) && Array.isArray(this.members) && this.members.length > 0) {
    this.currentMembers = this.members
      .map((member) => member.userId)
      .filter(Boolean);
  }

  if ((!this.members || this.members.length === 0) && Array.isArray(this.currentMembers) && this.currentMembers.length > 0) {
    this.members = this.currentMembers.map((userId) => ({ userId }));
  }

  next();
});

// Index for faster module searches
StudyGroupSchema.index({ module: 1 });
StudyGroupSchema.index({ isActive: 1 });

module.exports = mongoose.model('StudyGroup', StudyGroupSchema);
