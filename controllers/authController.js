const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, isDeleted: false });

    if (!user || !user.isEnabled) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or disabled account",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { login };