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

// Temporary report data for UI development.
// Replace with real backend/controller data after integration.
router.get("/reports", (req, res) => {
  res.render("reports", {
    title: "Reports",
    summary: {
      totalItems: 148,
      availableItems: 96,
      assignedItems: 52,
    },
    agingItems: [
      {
        assetTag: "LT-001",
        itemName: "Dell Latitude 5400",
        category: "Laptop",
        acquiredDate: "2021-01-18",
        status: "In-Use",
      },
      {
        assetTag: "MN-014",
        itemName: "Dell Monitor 24",
        category: "Monitor",
        acquiredDate: "2020-08-10",
        status: "Available",
      },
    ],
    assetsByUser: [
      {
        userName: "John Doe",
        email: "john@example.com",
        itemCount: 2,
      },
      {
        userName: "Mary Ann",
        email: "mary@example.com",
        itemCount: 1,
      },
      {
        userName: "Technician User",
        email: "tech@example.com",
        itemCount: 3,
      },
    ],
  });
});

// Temporary history data for UI development.
// Replace with real backend/controller data after integration.
router.get("/history", (req, res) => {
  res.render("history", {
    title: "History",
    historyRows: [
      {
        date: "2026-04-05",
        itemName: "Dell Latitude 5420",
        assetTag: "LT-032",
        action: "Check-Out",
        user: "John Doe",
        notes: "Assigned for office work",
      },
      {
        date: "2026-04-04",
        itemName: "HP ProBook 440",
        assetTag: "LT-017",
        action: "Check-In",
        user: "Mary Ann",
        notes: "Returned in good condition",
      },
      {
        date: "2026-04-03",
        itemName: "Lenovo ThinkPad T14",
        assetTag: "LT-021",
        action: "Maintenance",
        user: "Technician",
        notes: "Sent for keyboard repair",
      },
    ],
  });
});

module.exports = router;