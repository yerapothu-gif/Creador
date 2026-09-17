require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const app = require("./src/app");
const User = require("./src/models/User");
const { ContentItem, CATEGORIES } = require("./src/models/ContentItem");
const generateToken = require("./src/utils/generateToken");
const bcrypt = require("bcryptjs");

async function runVerification() {
  console.log("=== Verifying Content & Admin API Requirements ===\n");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✔ Connected to MongoDB");

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const adminEmail = `test_admin_${Date.now()}@creador.org`;
  const userEmail = `test_user_${Date.now()}@creador.org`;
  const password = "TestPassword@123";

  try {
    // 1. Create temporary test admin & user
    const passwordHash = await bcrypt.hash(password, 10);
    const adminUser = await User.create({
      name: "Test Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
    });
    const regularUser = await User.create({
      name: "Test Learner",
      email: userEmail,
      passwordHash,
      role: "user",
    });

    const adminToken = generateToken(adminUser);
    const userToken = generateToken(regularUser);

    console.log("✔ Created test admin and test learner");

    // ----------------------------------------------------
    // TEST 1: User cannot access POST /api/admin/content (403 expected)
    // ----------------------------------------------------
    console.log("\n[Test 1] Regular user attempting POST /api/admin/content...");
    const resUserCreate = await fetch(`${baseUrl}/api/admin/content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Unauthorized Resource",
        body: "Should be blocked.",
        category: "loans",
      }),
    });
    console.log(`Status: ${resUserCreate.status} (Expected: 403)`);
    if (resUserCreate.status !== 403) throw new Error("Expected 403 Forbidden for regular user on admin route");
    console.log("✔ Admin route correctly blocked regular user with 403 Forbidden");

    // ----------------------------------------------------
    // TEST 2: Invalid category rejected (400 expected)
    // ----------------------------------------------------
    console.log("\n[Test 2] Admin posting invalid category...");
    const resInvalidCat = await fetch(`${baseUrl}/api/admin/content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Invalid Category Resource",
        body: "Category is invalid.",
        category: "cryptocurrency", // invalid
      }),
    });
    console.log(`Status: ${resInvalidCat.status} (Expected: 400)`);
    if (resInvalidCat.status !== 400) throw new Error("Expected 400 Bad Request for invalid category");
    console.log("✔ Category validation rejected invalid category with 400 Bad Request");

    // ----------------------------------------------------
    // TEST 3: Admin successfully creates ContentItem (POST /api/admin/content)
    // ----------------------------------------------------
    console.log("\n[Test 3] Admin creating valid ContentItem...");
    const resCreate = await fetch(`${baseUrl}/api/admin/content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Kisan Credit Card (KCC) Scheme",
        body: "KCC offers short-term credit to farmers for crop cultivation and post-harvest expenses at subsidized interest.",
        category: "schemes",
        tags: ["farmers", "agriculture", "subsidy", "kcc"],
        mediaUrl: "https://example.com/kcc-guide",
        language: "en",
      }),
    });
    const createdItem = await resCreate.json();
    console.log(`Status: ${resCreate.status} (Expected: 201)`);
    console.log(`Created Item ID: ${createdItem._id}, Category: ${createdItem.category}`);
    if (resCreate.status !== 201 || !createdItem._id) throw new Error("Expected 201 and created item");
    console.log("✔ POST /api/admin/content succeeded with 201 Created");

    const createdId = createdItem._id;

    // ----------------------------------------------------
    // TEST 4: Authenticated user retrieves content with category filter
    // ----------------------------------------------------
    console.log("\n[Test 4] Authenticated user calling GET /api/content?category=schemes...");
    const resGetSchemes = await fetch(`${baseUrl}/api/content?category=schemes`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const schemesData = await resGetSchemes.json();
    console.log(`Status: ${resGetSchemes.status} (Expected: 200)`);
    console.log(`Returned items count: ${schemesData.length}`);
    if (resGetSchemes.status !== 200 || !Array.isArray(schemesData)) {
      throw new Error("Expected 200 and array from GET /api/content?category=schemes");
    }
    const foundItem = schemesData.find((item) => item._id === createdId);
    if (!foundItem) throw new Error("Created item not found in GET /api/content?category=schemes");
    console.log("✔ GET /api/content?category= successfully accessed by authenticated user and returned created item");

    // ----------------------------------------------------
    // TEST 5: Admin updates ContentItem (PUT /api/admin/content/:id)
    // ----------------------------------------------------
    console.log("\n[Test 5] Admin calling PUT /api/admin/content/:id...");
    const resUpdate = await fetch(`${baseUrl}/api/admin/content/${createdId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Kisan Credit Card (KCC) Scheme - Updated Guide 2026",
        tags: ["farmers", "agriculture", "subsidy", "kcc", "2026"],
      }),
    });
    const updatedItem = await resUpdate.json();
    console.log(`Status: ${resUpdate.status} (Expected: 200)`);
    console.log(`Updated Title: ${updatedItem.title}`);
    if (resUpdate.status !== 200 || updatedItem.title !== "Kisan Credit Card (KCC) Scheme - Updated Guide 2026") {
      throw new Error("Expected 200 and updated title from PUT /api/admin/content/:id");
    }
    console.log("✔ PUT /api/admin/content/:id successfully updated resource");

    // ----------------------------------------------------
    // TEST 6: Admin deletes ContentItem (DELETE /api/admin/content/:id)
    // ----------------------------------------------------
    console.log("\n[Test 6] Admin calling DELETE /api/admin/content/:id...");
    const resDelete = await fetch(`${baseUrl}/api/admin/content/${createdId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteData = await resDelete.json();
    console.log(`Status: ${resDelete.status} (Expected: 200)`);
    console.log(`Response:`, deleteData);
    if (resDelete.status !== 200 || !deleteData.success) {
      throw new Error("Expected 200 and { success: true } from DELETE /api/admin/content/:id");
    }
    console.log("✔ DELETE /api/admin/content/:id successfully deleted resource");

    // Verify it is gone
    const checkDeleted = await ContentItem.findById(createdId);
    if (checkDeleted) throw new Error("Document should have been deleted from DB");
    console.log("✔ Verified item no longer exists in database");

    // Clean up test users
    await User.deleteMany({ email: { $in: [adminEmail, userEmail] } });
    console.log("\n✔ Cleaned up temporary test users");

    console.log("\n=======================================================");
    console.log("🎉 ALL BACKEND CONTENT/ADMIN REQUIREMENTS VERIFIED 100%!");
    console.log("=======================================================");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
