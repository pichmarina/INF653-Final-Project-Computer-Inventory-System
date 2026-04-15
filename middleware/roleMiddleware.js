function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
}

function requireAdminView(req, res, next) {
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).render("error", {
      title: "Access Denied",
      message: "Admin access required",
    });
  }

  next();
}

module.exports = { requireAdmin, requireAdminView };