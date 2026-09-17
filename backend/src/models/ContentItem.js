const mongoose = require("mongoose");

// Frozen category enum — must be identical across ContentItem and Goal
const CATEGORIES = [
  "loans",
  "retirement",
  "investment",
  "taxation",
  "schemes",
  "scam_alert",
];

const contentItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    mediaUrl: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
      lowercase: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    language: {
      type: String,
      default: "en",
      trim: true,
    },
    format: {
      type: String,
      enum: ["article", "video", "quiz"],
      default: "article",
    },
    sequence: {
      type: Number,
      default: 1,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

// Index for category filtering, sequencing and search
contentItemSchema.index({ category: 1, sequence: 1, language: 1 });

const ContentItem = mongoose.model("ContentItem", contentItemSchema);

module.exports = {
  ContentItem,
  CATEGORIES,
};
