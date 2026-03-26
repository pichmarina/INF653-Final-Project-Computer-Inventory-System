const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    );

    res.json({
      success: true,
      message: "User role updated",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isEnabled: req.body.isEnabled },
      { new: true }
    );

    res.json({
      success: true,
      message: "User status updated",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createUser,
  updateUserRole,
  updateUserStatus,
};