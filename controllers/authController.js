const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const errors = {};

    if (!email || !email.trim()) {
      errors.email = "Email is required";
    }

    if (!password || !password.trim()) {
      errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("login", {
        title: "Login",
        errors,
        values: { email },
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });

    if (!user || !user.isEnabled) {
      return res.status(401).render("login", {
        title: "Login",
        formError: "Invalid credentials or disabled account",
        values: { email },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).render("login", {
        title: "Login",
        formError: "Invalid credentials",
        values: { email },
      });
    }

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.redirect("/dashboard");
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  res.clearCookie("token");
  return res.redirect("/login");
}

module.exports = { login, logout };