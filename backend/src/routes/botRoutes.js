const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { botRateLimit } = require("../middleware/botRateLimit");
const { handleBotQuery } = require("../controllers/botController");

const router = express.Router();

/**
 * POST /api/bot/query
 * Body: { text: string, lang?: "en"|"hi"|"mr"|"ta"|"te"|"bn" }
 * Response: { answer: string, sourceContentIds: string[], sources: [{_id, title, category}] }
 * Role: authenticated users only
 */
router.post("/query", requireAuth, botRateLimit, handleBotQuery);

module.exports = router;
