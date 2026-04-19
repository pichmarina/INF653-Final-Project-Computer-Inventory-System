const express = require("express");
const router = express.Router();
const { requireViewAuth } = require("../middleware/authMiddleware");
const { requireAdminView } = require("../middleware/roleMiddleware");
const { renderUsersPage } = require("../controllers/userController");
const { renderKeysPage } = require("../controllers/apiKeyController");
const { getDashboardData } = require("../controllers/reportController");
const { renderItemsPage } = require("../controllers/itemController");
const {
  renderSummaryReportPage,
  renderAgingReportPage,
  renderAssetsByUserReportPage,
} = require("../controllers/reportController");
const { exportReport } = require("../controllers/reportController");
const { renderHistoryPage } = require("../controllers/transactionController");
const Item = require("../models/Item");
const User = require("../models/User");

router.get("/login", (req, res) => {
  res.render("login", {
    title: "Login",
  });
});

router.get("/dashboard", requireViewAuth, getDashboardData);

router.get("/inventory", requireViewAuth, renderItemsPage);

router.get("/transactions", requireViewAuth, async (req, res, next) => {
  try {
    const items = await Item.find({ isDeleted: false }).lean();
    const users = await User.find({}).lean();

    const availableItems = items.filter((item) => item.status === "Available");
    const inUseItems = items.filter((item) => item.status === "In-Use");

    res.render("transactions", {
      title: "Check-Out / Check-In",
      user: req.user,
      users,
      availableItems,
      inUseItems,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/history", requireViewAuth, renderHistoryPage);

router.get("/reports", requireViewAuth, (req, res) => {
  res.render("reports", {
    title: "Reports",
    user: req.user,
  });
});

router.get("/reports/summary", requireViewAuth, renderSummaryReportPage);
router.get("/reports/aging", requireViewAuth, renderAgingReportPage);
router.get("/reports/by-user", requireViewAuth, renderAssetsByUserReportPage);
router.get("/reports/export/:type", requireViewAuth, exportReport);

router.get("/users", requireViewAuth, requireAdminView, renderUsersPage);
router.get("/keys", requireViewAuth, requireAdminView, renderKeysPage);
router.get("/items", requireViewAuth, (req, res) => {
  res.redirect("/inventory");
});

router.get("/items/new", requireViewAuth, (req, res) => {
  res.render("item-form", {
    title: "Add Item",
    isEdit: false,
    user: req.user,
    item: { status: "Available" },
  });
});

router.get("/items/:id/edit", requireViewAuth, async (req, res, next) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();

    if (!item) {
      return res.status(404).render("404", {
        title: "404 - Item Not Found",
        user: req.user,
      });
    }

    if (item.dateAcquired) {
      item.dateAcquired = new Date(item.dateAcquired).toISOString().split("T")[0];
    }

    res.render("item-form", {
      title: "Edit Item",
      isEdit: true,
      itemId: req.params.id,
      item,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/items/:id", requireViewAuth, async (req, res, next) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate("assignedTo", "name email")
      .lean();

    if (!item) {
      return res.status(404).render("404", {
        title: "404 - Item Not Found",
        user: req.user,
      });
    }

    if (item.dateAcquired) {
      item.dateAcquired = new Date(item.dateAcquired).toISOString().split("T")[0];
    }

    res.render("item-details", {
      title: "Item Details",
      itemId: req.params.id,
      item,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;