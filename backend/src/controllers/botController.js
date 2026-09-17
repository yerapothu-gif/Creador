const { retrieveRelevantContent } = require("../services/contentRetrievalService");
const { generateAnswerWithLLM, generateFallbackAnswer } = require("../services/llmService");

// Supported language codes
const SUPPORTED_LANGS = ["en", "hi", "mr", "ta", "te", "bn"];

/**
 * POST /api/bot/query
 * Body: { text: string, lang?: string }
 * Response: { answer: string, sourceContentIds: string[], sources: [{_id, title, category}] }
 * Role: authenticated users only (requireAuth applied in router)
 */
async function handleBotQuery(req, res) {
  try {
    const { text, lang = "en" } = req.body;

    // --- Input Validation ---
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "text query is required" });
    }

    const trimmedText = text.trim();

    if (trimmedText.length < 2) {
      return res.status(400).json({ message: "Query is too short. Please ask a full question." });
    }

    if (trimmedText.length > 500) {
      return res.status(400).json({ message: "Query is too long. Please limit to 500 characters." });
    }

    const normalizedLang = SUPPORTED_LANGS.includes(lang) ? lang : "en";

    // --- Step 1: Retrieve relevant ContentItems ---
    let contentDocs;
    try {
      contentDocs = await retrieveRelevantContent(trimmedText, 4);
    } catch (dbErr) {
      console.error("Content retrieval failed:", dbErr);
      contentDocs = [];
    }

    const sourceContentIds = contentDocs.map((doc) => doc._id.toString());
    const sources = contentDocs.map((doc) => ({
      _id: doc._id,
      title: doc.title,
      category: doc.category,
      format: doc.format || "article",
    }));

    // --- Step 2: Generate Answer ---
    let answer;

    if (!process.env.OPENAI_API_KEY) {
      // No LLM key — use smart template fallback
      console.warn("OPENAI_API_KEY not set — using fallback answer generation.");
      answer = generateFallbackAnswer(trimmedText, contentDocs);
    } else {
      try {
        answer = await generateAnswerWithLLM(trimmedText, contentDocs, normalizedLang);

        // Safety check — if LLM returned empty, fall back
        if (!answer || answer.trim().length === 0) {
          answer = generateFallbackAnswer(trimmedText, contentDocs);
        }
      } catch (llmErr) {
        console.error("LLM call failed:", llmErr?.message || llmErr);

        // Any LLM failure (rate limit, quota exhausted, auth misconfig, network,
        // etc.) still has retrieved Creador content available — fall back to the
        // template answer instead of failing the request, so the bot stays usable.
        answer = generateFallbackAnswer(trimmedText, contentDocs);
      }
    }

    return res.status(200).json({
      answer,
      sourceContentIds,
      sources,
    });
  } catch (err) {
    console.error("Error in handleBotQuery:", err);
    return res.status(500).json({ message: "Failed to process your question. Please try again." });
  }
}

module.exports = { handleBotQuery };
