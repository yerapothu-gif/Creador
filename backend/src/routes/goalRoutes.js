const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  createGoal,
  getMyGoal,
  completeModule,
} = require("../controllers/goalController");

const router = express.Router();

// All goal routes require an authenticated user
router.use(requireAuth);

// POST /api/goals — create new goal with day-by-day modules referencing ContentItems
router.post("/", createGoal);

// GET /api/goals/me — get current active goal (populated) and user progress/streak
router.get("/me", getMyGoal);

// POST /api/goals/:id/modules/:day/complete — mark module completed, update streak & badges
router.post("/:id/modules/:day/complete", completeModule);

module.exports = router;
