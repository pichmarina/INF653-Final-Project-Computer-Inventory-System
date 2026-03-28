const express = require("express");
const router = express.Router();
const { requireViewAuth } = require("../middleware/authMiddleware");
const { requireAdminView } = require("../middleware/roleMiddleware");
const { renderUsersPage } = require("../controllers/userController");
const { renderKeysPage } = require("../controllers/apiKeyController");

router.get("/login", (req, res) => {
  res.render("login", {
    title: "Login",
  });
});

router.get("/dashboard", requireViewAuth, (req, res) => {
  res.render("dashboard", {
    title: "Dashboard",
    user: req.user,
  });
});

router.get("/inventory", requireViewAuth, (req, res) => {
  res.render("inventory", {
    title: "Inventory Management",
    user: req.user,
  });
});

router.get("/transactions", requireViewAuth, (req, res) => {
  res.render("transactions", {
    title: "Check-Out / Check-In",
    user: req.user,
  });
});

router.get("/history", requireViewAuth, (req, res) => {
  res.render("history", {
    title: "Asset History",
    user: req.user,
  });
});

router.get("/reports", requireViewAuth, (req, res) => {
  res.render("reports", {
    title: "Reports",
    user: req.user,
  });
});

router.get("/users", requireViewAuth, requireAdminView, renderUsersPage);
router.get("/keys", requireViewAuth, requireAdminView, renderKeysPage);

module.exports = router;