const mongoose = require("mongoose");
const { ContentItem, CATEGORIES } = require("../models/ContentItem");

/**
 * GET /api/content
 * Query params: ?category= (e.g. loans, retirement)
 * Optional: ?language= (e.g. en, hi)
 * Optional: ?search=
 * Roles: user, admin
 */
async function getContent(req, res) {
  try {
    const { category, language, search } = req.query;
    const filter = {};

    if (category) {
      const normalizedCategory = category.toLowerCase().trim();
      if (!CATEGORIES.includes(normalizedCategory)) {
        return res.status(400).json({
          message: `Invalid category '${category}'. Allowed: ${CATEGORIES.join(", ")}`,
        });
      }
      filter.category = normalizedCategory;
    }

    if (language) {
      filter.language = language.trim();
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ title: regex }, { body: regex }, { tags: regex }];
    }

    const items = await ContentItem.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(items);
  } catch (err) {
    console.error("Error in getContent:", err);
    return res.status(500).json({ message: "Failed to retrieve content" });
  }
}

/**
 * GET /api/content/:id
 * Roles: user, admin
 */
async function getContentById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Content item not found" });
    }

    const item = await ContentItem.findById(id).lean();
    if (!item) {
      return res.status(404).json({ message: "Content item not found" });
    }
    return res.status(200).json(item);
  } catch (err) {
    console.error("Error in getContentById:", err);
    return res.status(500).json({ message: "Failed to retrieve content item" });
  }
}

/**
 * Direct service function for Person B (Goals) and Person C (Bot)
 * to query content programmatically without HTTP roundtrip.
 */
async function getItemsByCategory(category, limit = 10) {
  const normalizedCategory = category.toLowerCase().trim();
  return ContentItem.find({ category: normalizedCategory })
    .limit(limit)
    .lean();
}

module.exports = {
  getContent,
  getContentById,
  getItemsByCategory,
};
