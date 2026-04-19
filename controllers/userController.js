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

function buildUsersFilter(query = {}) {
  const search = String(query.q || "").trim();
  const status = String(query.status || "all").trim();
  const role = String(query.role || "all").trim();

  const mongoFilter = {
    isDeleted: false,
  };

  if (search) {
    mongoFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { role: { $regex: search, $options: "i" } },
    ];
  }

  if (status === "active") {
    mongoFilter.isEnabled = true;
  } else if (status === "disabled") {
    mongoFilter.isEnabled = false;
  }

  if (role === "Admin" || role === "Technician") {
    mongoFilter.role = role;
  }

  return {
    mongoFilter,
    search,
    status,
    role,
  };
}

async function buildUsersViewData(query = {}, extras = {}) {
  const { mongoFilter, search, status, role } = buildUsersFilter(query);

  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = 10;

  const totalFilteredUsers = await User.countDocuments(mongoFilter);
  const totalPages = Math.max(Math.ceil(totalFilteredUsers / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * limit;

  const users = await User.find(mongoFilter)
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const mappedUsers = users.map((user) => ({
    ...user,
    createdAtLabel: formatDate(user.createdAt),
  }));

  const allUsers = await User.find({ isDeleted: false }).select(
    "role isEnabled isDeleted"
  );

  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.isEnabled).length;
  const adminUsers = allUsers.filter((u) => u.role === "Admin").length;
  const technicianUsers = allUsers.filter((u) => u.role === "Technician").length;

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
    filters: {
      q: search,
      status,
      role,
    },
    pagination: {
      currentPage,
      totalPages,
      limit,
      totalFilteredUsers,
      hasPrevPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
      prevPage: currentPage - 1,
      nextPage: currentPage + 1,
      startIndex: totalFilteredUsers === 0 ? 0 : skip + 1,
      endIndex: Math.min(skip + mappedUsers.length, totalFilteredUsers),
    },
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