const mongoose = require("mongoose");
const { CATEGORIES } = require("./ContentItem");

const moduleSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContentItem",
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
      lowercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    modules: {
      type: [moduleSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Goal = mongoose.model("Goal", goalSchema);

module.exports = Goal;
