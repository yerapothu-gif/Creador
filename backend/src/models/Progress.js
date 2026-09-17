const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    streakCount: {
      type: Number,
      default: 0,
    },
    badges: {
      type: [String],
      default: [],
    },
    lastActiveDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Progress = mongoose.model("Progress", progressSchema);

module.exports = Progress;
