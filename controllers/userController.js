const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiKey = require("../models/ApiKey");

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

async function buildUsersViewData(query = {}, extras = {}) {
  const users = await User.find({ isDeleted: false })
    .select("-passwordHash")
    .sort({ createdAt: -1 });

  const mappedUsers = users.map((user) => ({
    ...user.toObject(),
    createdAtLabel: formatDate(user.createdAt),
  }));

  const totalUsers = mappedUsers.length;
  const activeUsers = mappedUsers.filter((u) => u.isEnabled).length;
  const adminUsers = mappedUsers.filter((u) => u.role === "Admin").length;
  const technicianUsers = mappedUsers.filter((u) => u.role === "Technician").length;

  return {
    title: "User Management",
    users: mappedUsers,
    stats: {
      totalUsers,
      activeUsers,
      adminUsers,
      technicianUsers,
    },
    successMessage: query.success || null,
    errorMessage: query.error || null,
    errors: extras.errors || {},
    formValues: extras.formValues || {},
  };
}

async function renderUsersPage(req, res, next) {
  try {
    const viewData = await buildUsersViewData(req.query);
    return res.render("users", viewData);
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
      ? await User.findOne({ email: email.toLowerCase().trim(), isDeleted: false })
      : null;

    if (existingUser) {
      errors.email = "This email is already in use";
    }

    if (Object.keys(errors).length > 0) {
      const viewData = await buildUsersViewData(req.query, {
        errors,
        formValues: { name, email, role },
      });

      return res.status(400).render("users", viewData);
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