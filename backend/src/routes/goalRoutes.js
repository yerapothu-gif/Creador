const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Stub for the auth proof plan. Person B replaces this with real Goal logic.
router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ goal: null });
});

module.exports = router;
