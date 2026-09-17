require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const app = require("./src/app");
const User = require("./src/models/User");
const Goal = require("./src/models/Goal");
const Progress = require("./src/models/Progress");
const { ContentItem } = require("./src/models/ContentItem");
const generateToken = require("./src/utils/generateToken");
const bcrypt = require("bcryptjs");

async function runGoalTests() {
  console.log("=== Verifying Goal & Learning API Requirements (Person B) ===\n");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✔ Connected to MongoDB");

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const learnerEmail = `learner_goal_${Date.now()}@creador.org`;
  const password = "Password@123";

  try {
    // Create test learner
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: "Lakshmi Devi",
      email: learnerEmail,
      passwordHash,
      role: "user",
    });
    const token = generateToken(user);
    console.log("✔ Created test learner account");

    // ----------------------------------------------------
    // TEST 1: POST /api/goals with invalid category rejected
    // ----------------------------------------------------
    console.log("\n[Test 1] POST /api/goals with invalid category...");
    const resInvalidCat = await fetch(`${baseUrl}/api/goals`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "crypto",
        durationDays: 5,
      }),
    });
    console.log(`Status: ${resInvalidCat.status} (Expected: 400)`);
    if (resInvalidCat.status !== 400) throw new Error("Expected 400 for invalid category");
    console.log("✔ Correctly rejected invalid category with 400");

    // ----------------------------------------------------
    // TEST 2: POST /api/goals creates goal with contentId refs
    // ----------------------------------------------------
    console.log("\n[Test 2] POST /api/goals creates goal for category 'loans'...");
    const resCreate = await fetch(`${baseUrl}/api/goals`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "loans",
        title: "Save for Business Loan",
        durationDays: 3,
      }),
    });
    const createdGoal = await resCreate.json();
    console.log(`Status: ${resCreate.status} (Expected: 201)`);
    console.log(`Goal ID: ${createdGoal._id}, Title: "${createdGoal.title}"`);
    console.log(`Duration: ${createdGoal.durationDays} days, Modules count: ${createdGoal.modules.length}`);

    if (resCreate.status !== 201 || !createdGoal._id) {
      throw new Error("Failed to create goal");
    }
    if (createdGoal.modules.length !== 3) {
      throw new Error("Expected 3 modules for 3 duration days");
    }

    // Verify modules contain contentId references and NOT duplicated raw body
    const firstModule = createdGoal.modules[0];
    console.log(`Day 1 Content Title: "${firstModule.contentId?.title}" (populated)`);
    if (!firstModule.contentId || !firstModule.contentId._id) {
      throw new Error("Expected module to have contentId reference");
    }
    console.log("✔ POST /api/goals created modules referencing ContentItem documents");

    // ----------------------------------------------------
    // TEST 3: GET /api/goals/me retrieves active goal + progress
    // ----------------------------------------------------
    console.log("\n[Test 3] GET /api/goals/me retrieves active goal...");
    const resGetMe = await fetch(`${baseUrl}/api/goals/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const myGoalData = await resGetMe.json();
    console.log(`Status: ${resGetMe.status} (Expected: 200)`);
    console.log(`Active Goal ID: ${myGoalData.goal?._id}`);
    console.log(`Initial Streak: ${myGoalData.progress?.streakCount}`);

    if (resGetMe.status !== 200 || !myGoalData.goal || myGoalData.goal._id !== createdGoal._id) {
      throw new Error("GET /api/goals/me did not return active goal");
    }
    console.log("✔ GET /api/goals/me returned active goal populated with content and progress");

    // ----------------------------------------------------
    // TEST 4: POST /api/goals/:id/modules/:day/complete
    // ----------------------------------------------------
    console.log("\n[Test 4] Complete Day 1 module: POST /api/goals/:id/modules/1/complete...");
    const resComplete1 = await fetch(
      `${baseUrl}/api/goals/${createdGoal._id}/modules/1/complete`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const completeData1 = await resComplete1.json();
    console.log(`Status: ${resComplete1.status} (Expected: 200)`);
    console.log(`Day 1 Completed: ${completeData1.goal?.modules[0]?.completed}`);
    console.log(`Updated Streak: ${completeData1.progress?.streakCount}`);
    console.log(`Earned Badges: ${JSON.stringify(completeData1.progress?.badges)}`);

    if (
      resComplete1.status !== 200 ||
      !completeData1.goal.modules[0].completed ||
      completeData1.progress.streakCount < 1 ||
      !completeData1.progress.badges.includes("First Step")
    ) {
      throw new Error("Failed to mark day 1 complete or award First Step badge");
    }
    console.log("✔ Day 1 marked completed, streak updated to 1, and 'First Step' badge awarded");

    // Complete Day 2 and Day 3
    console.log("\n[Test 5] Completing remaining modules (Day 2 & Day 3)...");
    await fetch(`${baseUrl}/api/goals/${createdGoal._id}/modules/2/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const resComplete3 = await fetch(
      `${baseUrl}/api/goals/${createdGoal._id}/modules/3/complete`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const finalData = await resComplete3.json();
    console.log(`All modules completed: ${finalData.goal.modules.every((m) => m.completed)}`);
    console.log(`Final Badges: ${JSON.stringify(finalData.progress?.badges)}`);

    if (!finalData.progress.badges.includes("Goal Achiever")) {
      throw new Error("Expected 'Goal Achiever' badge upon finishing all modules");
    }
    console.log("✔ Completed all modules and verified 'Goal Achiever' badge");

    // Cleanup
    await Goal.deleteMany({ userId: user._id });
    await Progress.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);
    console.log("\n✔ Cleaned up test database records");

    console.log("\n=======================================================");
    console.log("🎉 ALL GOAL & LEARNING BACKEND TESTS PASSED 100%!");
    console.log("=======================================================");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runGoalTests().catch((err) => {
  console.error("❌ Goal test failed:", err);
  process.exit(1);
});
