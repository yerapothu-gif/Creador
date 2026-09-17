require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const app = require("./src/app");
const User = require("./src/models/User");

async function runTests() {
  console.log("=== Running Auth, Protected Routes & Goal Protection Tests ===\n");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✔ Connected to MongoDB");

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testEmail = `testuser_${Date.now()}@example.com`;
  const adminEmail = `adminuser_${Date.now()}@example.com`;
  const testPassword = "Password123!";

  let userToken = null;
  let adminToken = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Goal route protection without token
    // ----------------------------------------------------
    console.log("\n[Test 1] Goal Protection: Requesting GET /api/goals/me without token...");
    const resNoToken = await fetch(`${baseUrl}/api/goals/me`);
    const dataNoToken = await resNoToken.json();
    console.log(`Status: ${resNoToken.status} (Expected: 401)`);
    console.log(`Response:`, dataNoToken);
    if (resNoToken.status !== 401) throw new Error("Expected 401 for unauthenticated request");
    console.log("✔ Protected goal route correctly blocked unauthenticated request.");

    // ----------------------------------------------------
    // TEST 2: Goal route protection with invalid token
    // ----------------------------------------------------
    console.log("\n[Test 2] Goal Protection: Requesting GET /api/goals/me with invalid token...");
    const resBadToken = await fetch(`${baseUrl}/api/goals/me`, {
      headers: { Authorization: "Bearer bad.token.here" }
    });
    const dataBadToken = await resBadToken.json();
    console.log(`Status: ${resBadToken.status} (Expected: 401)`);
    console.log(`Response:`, dataBadToken);
    if (resBadToken.status !== 401) throw new Error("Expected 401 for invalid token");
    console.log("✔ Protected goal route correctly blocked malformed/invalid token.");

    // ----------------------------------------------------
    // TEST 3: User Signup
    // ----------------------------------------------------
    console.log("\n[Test 3] User Signup: POST /api/auth/signup...");
    const resSignup = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: testEmail,
        password: testPassword
      })
    });
    const dataSignup = await resSignup.json();
    console.log(`Status: ${resSignup.status} (Expected: 201)`);
    console.log(`Response:`, dataSignup);

    if (resSignup.status !== 201 || !dataSignup.token || !dataSignup.user) {
      throw new Error("Signup failed or response shape mismatch");
    }
    userToken = dataSignup.token;
    console.log("✔ User successfully registered with token and role:", dataSignup.user.role);

    // ----------------------------------------------------
    // TEST 4: Protected Goal Route with valid user token
    // ----------------------------------------------------
    console.log("\n[Test 4] Protected Route: GET /api/goals/me with valid Bearer token...");
    const resGoal = await fetch(`${baseUrl}/api/goals/me`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const dataGoal = await resGoal.json();
    console.log(`Status: ${resGoal.status} (Expected: 200)`);
    console.log(`Response:`, dataGoal);
    if (resGoal.status !== 200) throw new Error("Expected 200 for authenticated goal access");
    console.log("✔ Successfully accessed protected goal route with user token.");

    // ----------------------------------------------------
    // TEST 5: Role Protection: User attempting Admin Route
    // ----------------------------------------------------
    console.log("\n[Test 5] Role Protection: Regular user attempting POST /api/admin/content...");
    const resForbidden = await fetch(`${baseUrl}/api/admin/content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title: "Test Content" })
    });
    const dataForbidden = await resForbidden.json();
    console.log(`Status: ${resForbidden.status} (Expected: 403)`);
    console.log(`Response:`, dataForbidden);
    if (resForbidden.status !== 403) throw new Error("Expected 403 when regular user accesses admin route");
    console.log("✔ Admin route correctly returned 403 Forbidden for regular user.");

    // ----------------------------------------------------
    // TEST 6: Admin Signup & Admin Route Access
    // ----------------------------------------------------
    console.log("\n[Test 6] Admin Flow: Creating admin user and accessing admin route...");
    // Create admin user in DB
    const bcrypt = require("bcryptjs");
    const generateToken = require("./src/utils/generateToken");
    const adminHash = await bcrypt.hash(testPassword, 10);
    const adminDoc = await User.create({
      name: "Admin User",
      email: adminEmail,
      passwordHash: adminHash,
      role: "admin"
    });
    adminToken = generateToken(adminDoc);

    const resAdmin = await fetch(`${baseUrl}/api/admin/content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "Admin Resource",
        body: "Detailed guide on applying for collateral-free microloans.",
        category: "loans"
      })
    });
    const dataAdmin = await resAdmin.json();
    console.log(`Status: ${resAdmin.status} (Expected: 201)`);
    console.log(`Response:`, dataAdmin);
    if (resAdmin.status !== 201) throw new Error("Expected 201 when admin accesses admin route");
    console.log("✔ Admin route authorized admin user successfully.");

    // Clean up created content item if present
    if (dataAdmin._id) {
      const { ContentItem } = require("./src/models/ContentItem");
      await ContentItem.findByIdAndDelete(dataAdmin._id);
    }

    // ----------------------------------------------------
    // TEST 7: User Login
    // ----------------------------------------------------
    console.log("\n[Test 7] User Login: POST /api/auth/login...");
    const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const dataLogin = await resLogin.json();
    console.log(`Status: ${resLogin.status} (Expected: 200)`);
    console.log(`Response:`, dataLogin);
    if (resLogin.status !== 200 || !dataLogin.token) {
      throw new Error("Expected 200 and token on login");
    }
    console.log("✔ Login successful with credentials.");

    // Clean up created test users
    await User.deleteMany({ email: { $in: [testEmail, adminEmail] } });
    console.log("\n✔ Cleaned up test database records.");

    console.log("\n=======================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! AUTH PROOF COMPLETE.");
    console.log("=======================================================");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
