const mongoose = require("mongoose");
const { ContentItem, CATEGORIES } = require("../models/ContentItem");

/**
 * POST /api/admin/content
 * Body: { title, body, category, tags, mediaUrl, language }
 * Role: admin only
 */
async function createContent(req, res) {
  try {
    const { title, body, category, tags, mediaUrl, language } = req.body;

    if (!title || !body || !category) {
      return res.status(400).json({
        message: "title, body, and category are required fields",
      });
    }

    const normalizedCategory = category.toLowerCase().trim();
    if (!CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        message: `Invalid category '${category}'. Must be one of: ${CATEGORIES.join(", ")}`,
      });
    }

    const createdBy =
      req.user && mongoose.Types.ObjectId.isValid(req.user.userId)
        ? req.user.userId
        : undefined;

    const item = await ContentItem.create({
      title: title.trim(),
      body: body.trim(),
      category: normalizedCategory,
      tags: Array.isArray(tags) ? tags : [],
      mediaUrl: mediaUrl ? mediaUrl.trim() : "",
      language: language ? language.trim() : "en",
      createdBy,
    });

    return res.status(201).json(item);
  } catch (err) {
    console.error("Error in createContent:", err);
    return res.status(500).json({ message: "Failed to create content item" });
  }
}

/**
 * PUT /api/admin/content/:id
 * Body: partial ContentItem
 * Role: admin only
 */
async function updateContent(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Content item not found" });
    }

    const { title, body, category, tags, mediaUrl, language } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (body !== undefined) updates.body = body.trim();
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (mediaUrl !== undefined) updates.mediaUrl = mediaUrl.trim();
    if (language !== undefined) updates.language = language.trim();

    if (category !== undefined) {
      const normalizedCategory = category.toLowerCase().trim();
      if (!CATEGORIES.includes(normalizedCategory)) {
        return res.status(400).json({
          message: `Invalid category '${category}'. Must be one of: ${CATEGORIES.join(", ")}`,
        });
      }
      updates.category = normalizedCategory;
    }

    const updatedItem = await ContentItem.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ message: "Content item not found" });
    }

    return res.status(200).json(updatedItem);
  } catch (err) {
    console.error("Error in updateContent:", err);
    return res.status(500).json({ message: "Failed to update content item" });
  }
}

/**
 * DELETE /api/admin/content/:id
 * Role: admin only
 * Response: { success: true }
 */
async function deleteContent(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Content item not found" });
    }

    const deleted = await ContentItem.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Content item not found" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in deleteContent:", err);
    return res.status(500).json({ message: "Failed to delete content item" });
  }
}

module.exports = {
  createContent,
  updateContent,
  deleteContent,
};
