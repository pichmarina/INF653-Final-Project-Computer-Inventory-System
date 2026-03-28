require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await User.findOne({ email: "admin@example.com" });

    if (existing) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash("123456", 10);

    await User.create({
      name: "System Admin",
      email: "admin@example.com",
      passwordHash,
      role: "Admin",
      isEnabled: true,
    });

    console.log("Admin created successfully");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedAdmin();