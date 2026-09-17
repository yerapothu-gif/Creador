const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  createContent,
  updateContent,
  deleteContent,
} = require("../controllers/adminContentController");

const router = express.Router();

// All routes require authenticated user with admin role
router.use(requireAuth, requireRole("admin"));

// POST /api/admin/content
router.post("/", createContent);

// PUT /api/admin/content/:id
router.put("/:id", updateContent);

// DELETE /api/admin/content/:id
router.delete("/:id", deleteContent);

module.exports = router;
