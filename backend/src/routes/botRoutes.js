const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { ContentItem } = require("../models/ContentItem");

const router = express.Router();

/**
 * POST /api/bot/query
 * Body: { text: string, lang?: string }
 * Response: { answer: string, sourceContentIds: string[] }
 * Role: user (protected)
 *
 * Stub ready for Person C to plug in LLM / Gemini / OpenAI retrieval.
 */
router.post("/query", requireAuth, async (req, res) => {
  try {
    const { text, lang = "en" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "text query is required" });
    }

    // Default basic retrieval over ContentItem library
    const keywords = text.trim().split(/\s+/).slice(0, 3);
    const regexList = keywords.map((k) => new RegExp(k, "i"));
    const matchingDocs = await ContentItem.find({
      $or: [{ title: { $in: regexList } }, { body: { $in: regexList } }, { tags: { $in: regexList } }],
    })
      .limit(3)
      .lean();

    const sourceContentIds = matchingDocs.map((doc) => doc._id.toString());
    const answer =
      matchingDocs.length > 0
        ? `Based on our verified resources on ${matchingDocs.map((d) => d.title).join(", ")}: ${matchingDocs[0].body.slice(0, 200)}...`
        : "I found no direct match in our financial literacy resources. Please consult a financial counselor or explore our guides on loans and savings.";

    return res.status(200).json({
      answer,
      sourceContentIds,
    });
  } catch (err) {
    console.error("Error in /api/bot/query:", err);
    return res.status(500).json({ message: "Failed to process bot query" });
  }
});

module.exports = router;
