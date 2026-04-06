const express = require("express");
const router = express.Router();

router.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

// Temporary dashboard data for UI development.
// Replace with real backend/controller data after integration.
router.get("/dashboard", (req, res) => {
  res.render("dashboard", { 
    title: "Dashboard",
    stats: {
      totalUsers: 12,
      totalItems: 148,
      availableItems: 96,
      deployedItems: 52,
    },
    quickLinks: [
      {
        title: "Login",
        description: "Go to the login page for authentication testing.",
        href: "/login",
      },
      {
        title: "Reports",
        description: "View inventory summaries, aging assets, and assigned asset reports.",
        href: "/reports",
      },
      {
        title: "History",
        description: "Review check-in and check-out activity and item movement history.",
        href: "/history",
      },
    ],
    recentActivity: [
      {
        itemName: "Dell Latitude 5420",
        action: "Checked Out",
        user: "John Doe",
        date: "2026-04-05",
        status: "In-Use",
      },
      {
        itemName: "HP ProBook 440",
        action: "Checked In",
        user: "Mary Ann",
        date: "2026-04-04",
        status: "Available",
      },
      {
        itemName: "Lenovo ThinkPad T14",
        action: "Maintenance Update",
        user: "Technician",
        date: "2026-04-03",
        status: "Maintenance",
      },
    ],
  });
});

router.get("/reports", (req, res) => {
  res.render("reports", { title: "Reports" });
});

router.get("/history", (req, res) => {
  res.render("history", { title: "History" });
});

module.exports = router;