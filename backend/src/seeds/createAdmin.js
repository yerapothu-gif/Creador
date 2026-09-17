/**
 * Usage: node src/seeds/createAdmin.js
 * Creates (or promotes) an admin user for demo/dev purposes.
 * Never expose this in production.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const ADMIN_NAME = process.env.ADMIN_NAME || "Creador Admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@creador.org";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  if (existing) {
    if (existing.role === "admin") {
      console.log(`✔ Admin already exists: ${existing.email} (role: admin)`);
    } else {
      // Promote existing user to admin
      existing.role = "admin";
      await existing.save();
      console.log(`✔ Promoted existing user to admin: ${existing.email}`);
    }
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: "admin",
  });

  console.log("✔ Admin user created successfully:");
  console.log(`   Name    : ${admin.name}`);
  console.log(`   Email   : ${admin.email}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role    : ${admin.role}`);
  console.log("\n⚠️  Change the password before deploying to production!");

  await mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
