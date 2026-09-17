const { ContentItem, CATEGORIES } = require("../models/ContentItem");

/**
 * Detects which ContentItem category the query most likely relates to.
 * Returns a category string or null if no clear match.
 */
function detectCategory(text) {
  const lower = text.toLowerCase();
  const categoryKeywords = {
    loans: ["loan", "emi", "mudra", "credit", "borrow", "interest", "debt", "repay", "microfinance", "shg", "collateral"],
    retirement: ["retire", "pension", "atal", "apy", "old age", "anuvritti", "bhumihin"],
    investment: ["invest", "mutual fund", "sip", "fd", "recurring deposit", "gold bond", "compound", "savings", "grow money"],
    taxation: ["tax", "pan", "tds", "income tax", "itr", "gst", "return filing", "rebate"],
    schemes: ["scheme", "yojana", "jan dhan", "sukanya", "pmjdy", "subsidy", "government", "pmjsy", "pmay", "ration"],
    scam_alert: ["scam", "fraud", "fake", "cheat", "otp", "upi", "phishing", "blackmail", "loan app", "lottery", "cyber"],
  };

  let bestCategory = null;
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return bestScore > 0 ? bestCategory : null;
}

/**
 * Splits query into meaningful search tokens (ignores stop words).
 */
function extractKeywords(text) {
  const stopWords = new Set([
    "i", "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "can", "how", "what", "when", "where", "why", "who", "which",
    "to", "of", "in", "on", "at", "by", "for", "with", "from", "up", "about",
    "me", "my", "get", "help", "please", "tell", "explain", "want", "need",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

/**
 * Retrieves relevant ContentItems for a given query.
 * Strategy:
 * 1. Detect category from query text.
 * 2. Extract keywords.
 * 3. Build a MongoDB $or query across title, body, tags.
 * 4. If category detected, boost by filtering to that category first.
 * 5. Return top N results (default 4).
 */
async function retrieveRelevantContent(query, maxResults = 4) {
  const keywords = extractKeywords(query);
  const detectedCategory = detectCategory(query);

  if (keywords.length === 0) {
    // No searchable words in the query (e.g. only stop words or symbols).
    // Only fall back to category-scoped content when a category was actually
    // detected — otherwise return nothing so the bot admits it doesn't know
    // rather than presenting unrelated content as an answer.
    if (!detectedCategory) return [];
    return ContentItem.find({ category: detectedCategory })
      .sort({ sequence: 1 })
      .limit(maxResults)
      .lean();
  }

  // Build regex list (use at most 5 keywords to avoid over-specific queries)
  const topKeywords = keywords.slice(0, 5);
  const regexList = topKeywords.map((k) => new RegExp(k, "i"));

  const orConditions = [
    { title: { $in: regexList } },
    { body: { $in: regexList } },
    { tags: { $in: regexList } },
  ];

  // Primary: category-scoped search (if we detected one)
  if (detectedCategory) {
    const categoryResults = await ContentItem.find({
      category: detectedCategory,
      $or: orConditions,
    })
      .sort({ sequence: 1 })
      .limit(maxResults)
      .lean();

    if (categoryResults.length >= 2) {
      return categoryResults;
    }

    // Supplement with uncategorized keyword search if too few category matches
    const supplemental = await ContentItem.find({
      category: { $ne: detectedCategory },
      $or: orConditions,
    })
      .limit(maxResults - categoryResults.length)
      .lean();

    return [...categoryResults, ...supplemental].slice(0, maxResults);
  }

  // No category detected — broad keyword search.
  // If nothing matches, return an empty list rather than unrelated content —
  // the controller/LLM must say "I don't have enough information" instead of
  // presenting arbitrary ContentItems as if they were relevant sources.
  return ContentItem.find({ $or: orConditions })
    .limit(maxResults)
    .lean();
}

module.exports = { retrieveRelevantContent, detectCategory, extractKeywords };
