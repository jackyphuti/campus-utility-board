const mongoose = require('mongoose');

const LabSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    building: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
    },
    totalPCs: {
      type: Number,
      required: true,
      min: 1,
      default: 30,
    },
    availablePCs: {
      type: Number,
      required: true,
      min: 0,
      default: 30,
    },
    status: {
      type: String,
      enum: ['empty', 'busy', 'full'],
      default: 'empty',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    operatingHours: {
      start: {
        type: String,
        default: '07:00',
      },
      end: {
        type: String,
        default: '22:00',
      },
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Calculate status based on available PCs
LabSchema.methods.updateStatus = function () {
  const percentage = (this.availablePCs / this.totalPCs) * 100;
  if (percentage === 0) {
    this.status = 'full';
  } else if (percentage < 30) {
    this.status = 'busy';
  } else {
    this.status = 'empty';
  }
  this.lastUpdated = new Date();
};

LabSchema.index({ building: 1 });

module.exports = mongoose.model('Lab', LabSchema);
