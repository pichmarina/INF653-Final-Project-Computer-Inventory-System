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
    displayName: req.user.name,
    displayEmail: req.user.email,
    displayRole: req.user.role,
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
router.get("/items", (req, res) => {
  res.render("items", {
    title: "Inventory List",
  });
});

router.get("/items/new", (req, res) => {
  res.render("item-form", {
    title: "Add Item",
    isEdit: false,
  });
});

router.get("/items/:id/edit", (req, res) => {
  res.render("item-form", {
    title: "Edit Item",
    isEdit: true,
    itemId: req.params.id,
  });
});

router.get("/items/:id", (req, res) => {
  res.render("item-details", {
    title: "Item Details",
    itemId: req.params.id,
  });
});

router.get("/checkout", (req, res) => {
  res.render("checkout-form", {
    title: "Check Out Item",
  });
});

router.get("/checkin", (req, res) => {
  res.render("checkin-form", {
    title: "Check In Item",
  });
});

module.exports = router;