const mongoose = require("mongoose");
const Goal = require("../models/Goal");
const Progress = require("../models/Progress");
const { ContentItem, CATEGORIES } = require("../models/ContentItem");

/**
 * Helper to get or initialize a user's Progress record.
 */
async function getOrCreateProgress(userId) {
  let progress = await Progress.findOne({ userId });
  if (!progress) {
    progress = await Progress.create({
      userId,
      streakCount: 0,
      badges: [],
      lastActiveDate: new Date(),
    });
  }
  return progress;
}

/**
 * Helper to compute streak logic.
 * - Same day: keep streak.
 * - Yesterday: increment streak.
 * - Missed > 1 day: reset streak to 1.
 */
function calculateUpdatedStreak(currentStreak, lastActiveDate) {
  if (!lastActiveDate) return 1;

  const now = new Date();
  const last = new Date(lastActiveDate);

  // Normalize to UTC calendar days (midnight)
  const nowDate = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDate = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
  const diffDays = Math.floor((nowDate - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Already completed an action today: preserve streak (at least 1)
    return Math.max(currentStreak, 1);
  } else if (diffDays === 1) {
    // Active yesterday: increment streak
    return currentStreak + 1;
  } else {
    // Missed one or more days: reset streak to 1
    return 1;
  }
}

/**
 * POST /api/goals
 * Body: { category, title?, durationDays? }
 * Roles: user, admin
 */
async function createGoal(req, res) {
  try {
    const { category, title, durationDays = 7 } = req.body;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    const normalizedCategory = category.toLowerCase().trim();
    if (!CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        message: `Invalid category '${category}'. Allowed: ${CATEGORIES.join(", ")}`,
      });
    }

    const days = Math.max(1, Math.min(30, parseInt(durationDays, 10) || 7));

    // 1. Find ContentItems matching this category ordered by sequence, then createdAt
    const contentDocs = await ContentItem.find({ category: normalizedCategory })
      .sort({ sequence: 1, createdAt: 1 })
      .select("_id title format sequence difficulty")
      .lean();

    if (!contentDocs || contentDocs.length === 0) {
      return res.status(400).json({
        message: `No content items available for category '${normalizedCategory}'. Please ask an admin to add resources first.`,
      });
    }

    // 2. Build modules referencing contentId (do NOT copy content body)
    const modules = [];
    for (let day = 1; day <= days; day++) {
      const selectedContent = contentDocs[(day - 1) % contentDocs.length];
      modules.push({
        day,
        contentId: selectedContent._id,
        completed: false,
      });
    }

    // 3. Determine Goal Title
    const defaultTitleMap = {
      loans: "Master Loans & Microfinance",
      retirement: "Retirement & Pension Security",
      investment: "Build Wealth with Smart Investments",
      taxation: "Taxation & PAN Fundamentals",
      schemes: "Access Government Schemes & Subsidies",
      scam_alert: "Financial Safety & Scam Protection",
    };

    const goalTitle =
      (title && title.trim()) ||
      defaultTitleMap[normalizedCategory] ||
      `Financial Goal: ${normalizedCategory.toUpperCase()}`;

    // 4. Create the Goal document
    const goal = await Goal.create({
      userId: req.user.userId,
      category: normalizedCategory,
      title: goalTitle,
      durationDays: days,
      modules,
    });

    // Ensure progress record exists
    await getOrCreateProgress(req.user.userId);

    // Populate contentId before returning
    const populatedGoal = await Goal.findById(goal._id)
      .populate("modules.contentId")
      .lean();

    return res.status(201).json(populatedGoal);
  } catch (err) {
    console.error("Error in createGoal:", err);
    return res.status(500).json({ message: "Failed to create learning goal" });
  }
}

/**
 * GET /api/goals/me
 * Returns the latest active goal populated with ContentItems, plus Progress.
 * Roles: user, admin
 */
async function getMyGoal(req, res) {
  try {
    const userId = req.user.userId;

    const goal = await Goal.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate("modules.contentId")
      .lean();

    const progress = await getOrCreateProgress(userId);

    return res.status(200).json({
      goal: goal || null,
      progress: progress || { streakCount: 0, badges: [] },
    });
  } catch (err) {
    console.error("Error in getMyGoal:", err);
    return res.status(500).json({ message: "Failed to fetch user goal" });
  }
}

/**
 * POST /api/goals/:id/modules/:day/complete
 * Marks a specific day's module complete, updates streak & awards badges.
 * Roles: user, admin
 */
async function completeModule(req, res) {
  try {
    const { id, day } = req.params;
    const userId = req.user.userId;
    const dayNumber = parseInt(day, 10);

    if (!mongoose.Types.ObjectId.isValid(id) || isNaN(dayNumber)) {
      return res.status(400).json({ message: "Invalid goal ID or day number" });
    }

    const goal = await Goal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const targetModule = goal.modules.find((m) => m.day === dayNumber);
    if (!targetModule) {
      return res.status(404).json({ message: `Module for day ${dayNumber} not found` });
    }

    // Mark completed
    targetModule.completed = true;
    await goal.save();

    // Update progress & streak
    const progress = await getOrCreateProgress(userId);
    const newStreak = calculateUpdatedStreak(progress.streakCount, progress.lastActiveDate);
    progress.streakCount = newStreak;
    progress.lastActiveDate = new Date();

    // Check & award badges
    const badgesSet = new Set(progress.badges || []);

    // 1. First module completed
    badgesSet.add("First Step");

    // 2. Count total completed modules across current goal
    const totalModules = goal.modules.length;
    const completedCount = goal.modules.filter((m) => m.completed).length;

    if (completedCount >= Math.ceil(totalModules / 2)) {
      badgesSet.add("Halfway Milestone");
    }

    if (completedCount === totalModules) {
      badgesSet.add("Goal Achiever");
      badgesSet.add(`${goal.category.toUpperCase()} Master`);
    }

    if (progress.streakCount >= 3) {
      badgesSet.add("3-Day Streak");
    }
    if (progress.streakCount >= 7) {
      badgesSet.add("7-Day Champion");
    }

    progress.badges = Array.from(badgesSet);
    await progress.save();

    // Populate and return { goal, progress }
    const populatedGoal = await Goal.findById(goal._id)
      .populate("modules.contentId")
      .lean();

    return res.status(200).json({
      goal: populatedGoal,
      progress,
    });
  } catch (err) {
    console.error("Error in completeModule:", err);
    return res.status(500).json({ message: "Failed to mark module complete" });
  }
}

module.exports = {
  createGoal,
  getMyGoal,
  completeModule,
};
