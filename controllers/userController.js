const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiKey = require("../models/ApiKey");

async function renderUsersPage(req, res, next) {
  try {
    const users = await User.find({ isDeleted: false })
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    return res.render("users", {
      title: "User Management",
      users,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null,
    });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const errors = {};

    if (!name || !name.trim()) errors.name = "Name is required";
    if (!email || !email.trim()) errors.email = "Email is required";
    if (!password || password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (role && !["Admin", "Technician"].includes(role)) {
      errors.role = "Role must be Admin or Technician";
    }

    const existingUser = email
      ? await User.findOne({ email: email.toLowerCase(), isDeleted: false })
      : null;

    if (existingUser) {
      errors.email = "This email is already in use";
    }

    if (Object.keys(errors).length > 0) {
      const users = await User.find({ isDeleted: false })
        .select("-passwordHash")
        .sort({ createdAt: -1 });

      return res.status(400).render("users", {
        title: "User Management",
        users,
        errors,
        formValues: { name, email, role },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role || "Technician",
    });

    return res.redirect("/users?success=User created successfully");
  } catch (error) {
    next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;

    if (!["Admin", "Technician"].includes(role)) {
      return res.redirect("/users?error=Invalid role");
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { role },
      { new: true }
    );

    if (!user) {
      return res.redirect("/users?error=User not found");
    }

    return res.redirect("/users?success=User role updated");
  } catch (error) {
    next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const isEnabled = req.body.isEnabled === "true";

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isEnabled },
      { new: true }
    );

    if (!user) {
      return res.redirect("/users?error=User not found");
    }

    if (!isEnabled) {
      await ApiKey.updateMany(
        { createdBy: user._id, isRevoked: false },
        { isRevoked: true }
      );
    }

    return res.redirect("/users?success=User status updated");
  } catch (error) {
    next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    const users = await User.find({ isDeleted: false })
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderUsersPage,
  createUser,
  updateUserRole,
  updateUserStatus,
  getUsers,
};