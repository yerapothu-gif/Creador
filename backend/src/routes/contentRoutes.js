const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getContent, getContentById } = require("../controllers/contentController");

const router = express.Router();

// As per API contract: GET /api/content (accessible by user, admin)
router.get("/", requireAuth, getContent);
router.get("/:id", requireAuth, getContentById);

module.exports = router;
