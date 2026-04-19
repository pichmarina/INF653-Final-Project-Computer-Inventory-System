const bcrypt = require("bcryptjs");
const fs = require("fs/promises");
const path = require("path");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

function buildProfileViewData(user, query = {}, extras = {}) {
  return {
    title: "My Profile",
    user,
    successMessage: query.success || null,
    errorMessage: query.error || null,
    errors: extras.errors || {},
    formValues: extras.formValues || {
      name: user?.name || "",
      email: user?.email || "",
    },
  };
}

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

async function removeFileIfExists(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function toAbsoluteUploadPath(urlPath) {
  if (!urlPath) return null;

  const normalizedPath = String(urlPath).replace(/^\//, "");
  return path.join(__dirname, "..", normalizedPath);
}

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

async function renderProfilePage(req, res, next) {
  try {
    const user = await User.findOne({ _id: req.user._id, isDeleted: false })
      .select("name email role avatarPath isEnabled createdAt updatedAt")
      .lean();

    if (!user) {
      res.clearCookie("token");
      return res.redirect("/login");
    }

    const viewData = buildProfileViewData(user, req.query);
    return res.render("profile", viewData);
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, email, currentPassword, newPassword, confirmPassword } =
      req.body;

    const currentUser = await User.findOne({
      _id: req.user._id,
      isDeleted: false,
    });

    if (!currentUser) {
      res.clearCookie("token");
      return res.redirect("/login");
    }

    const errors = {};

    const trimmedName = String(name || "").trim();
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const uploadedAvatarPath = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : null;

    if (!trimmedName) {
      errors.name = "Name is required";
    }

    if (!normalizedEmail) {
      errors.email = "Email is required";
    }

    const wantsPasswordChange =
      Boolean(currentPassword && String(currentPassword).trim()) ||
      Boolean(newPassword && String(newPassword).trim()) ||
      Boolean(confirmPassword && String(confirmPassword).trim());

    if (wantsPasswordChange) {
      if (!currentPassword || !String(currentPassword).trim()) {
        errors.currentPassword =
          "Current password is required to change your password";
      }

      if (!newPassword || String(newPassword).length < 6) {
        errors.newPassword = "New password must be at least 6 characters";
      }

      if ((newPassword || "") !== (confirmPassword || "")) {
        errors.confirmPassword = "Password confirmation does not match";
      }
    }

    if (!errors.email && normalizedEmail !== currentUser.email) {
      const existingUser = await User.findOne({
        email: normalizedEmail,
        isDeleted: false,
        _id: { $ne: currentUser._id },
      }).lean();

      if (existingUser) {
        errors.email = "This email is already in use";
      }
    }

    if (wantsPasswordChange && !errors.currentPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(
        String(currentPassword),
        currentUser.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        errors.currentPassword = "Current password is incorrect";
      }
    }

    if (Object.keys(errors).length > 0) {
      if (req.file) {
        await removeFileIfExists(req.file.path);
      }

      const viewData = buildProfileViewData(
        {
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          avatarPath: currentUser.avatarPath,
          isEnabled: currentUser.isEnabled,
          createdAt: currentUser.createdAt,
          updatedAt: currentUser.updatedAt,
        },
        req.query,
        {
          errors,
          formValues: {
            name: trimmedName,
            email: normalizedEmail,
          },
        },
      );

      return res.status(400).render("profile", viewData);
    }

    currentUser.name = trimmedName;
    currentUser.email = normalizedEmail;

    if (wantsPasswordChange) {
      currentUser.passwordHash = await bcrypt.hash(String(newPassword), 10);
    }

    let oldAvatarPath = null;
    if (uploadedAvatarPath) {
      oldAvatarPath = currentUser.avatarPath;
      currentUser.avatarPath = uploadedAvatarPath;
    }

    await currentUser.save();

    if (oldAvatarPath && oldAvatarPath !== uploadedAvatarPath) {
      await removeFileIfExists(toAbsoluteUploadPath(oldAvatarPath));
    }

    const refreshedToken = generateToken(currentUser);
    res.cookie("token", refreshedToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.redirect("/profile?success=Profile updated successfully");
  } catch (error) {
    if (req.file) {
      try {
        await removeFileIfExists(req.file.path);
      } catch (cleanupError) {
        // Ignore cleanup failures and surface the original error.
      }
    }

    next(error);
  }
}

module.exports = { login, logout, renderProfilePage, updateProfile };
