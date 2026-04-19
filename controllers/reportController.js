const Item = require("../models/Item");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { Parser } = require('json2csv');

async function getSummaryReport(req, res, next) {
  try {
    const total = await Item.countDocuments({ isDeleted: false });
    const deployed = await Item.countDocuments({
      isDeleted: false,
      status: "In-Use",
    });

    const maintenance = await Item.countDocuments({ isDeleted: false, status: "Maintenance" });
    res.json({
      success: true,
      data: {
        total,
        deployed,
        available: total - deployed,
        maintenance,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getOlderThanThreeYears(req, res, next) {
  try {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const items = await Item.find({
      isDeleted: false,
      dateAcquired: { $lt: threeYearsAgo },
    });

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

async function getAssetsByUser(req, res, next) {
  try {
    const items = await Item.find({
      isDeleted: false,
      assignedTo: req.query.userId,
    }).populate("assignedTo", "name email");

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

// Render Inventory Summary Report
async function renderSummaryReportPage(req, res, next) {
  try {
    const total = await Item.countDocuments({ isDeleted: false });
    const deployed = await Item.countDocuments({ isDeleted: false, status: "In-Use" });
    const available = total - deployed;
    res.render("reports", {
      title: "Reports",
      user: req.user,
      summary: { total, deployed, available },
      reportType: "summary"
    });
  } catch (error) {
    next(error);
  }
}

// Render Asset Aging Report
async function renderAgingReportPage(req, res, next) {
  try {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const items = await Item.find({ isDeleted: false, dateAcquired: { $lt: threeYearsAgo } });
    res.render("reports", {
      title: "Reports",
      user: req.user,
      agingItems: items,
      reportType: "aging"
    });
  } catch (error) {
    next(error);
  }
}

// Render Assets by User Report
async function renderAssetsByUserReportPage(req, res, next) {
  try {
    const users = await User.find({ isDeleted: false });
    const items = await Item.find({ isDeleted: false }).populate("assignedTo", "name email");
    // Group items by user
    const assetsByUser = users.map(user => ({
      user: user.toObject(),
      items: items.filter(item => item.assignedTo && item.assignedTo._id.equals(user._id))
    }));
    res.render("reports", {
      title: "Reports",
      user: req.user,
      assetsByUser,
      reportType: "byUser"
    });
  } catch (error) {
    next(error);
  }
}

async function getDashboardData(req, res, next) {
  try {
    // Stats
    const [totalItems, deployedItems, availableItems, maintenanceItems, totalUsers] = await Promise.all([
      Item.countDocuments({ isDeleted: false }),
      Item.countDocuments({ isDeleted: false, status: "In-Use" }),
      Item.countDocuments({ isDeleted: false, status: "Available" }),
      Item.countDocuments({ isDeleted: false, status: "Maintenance" }),
      User.countDocuments({ isDeleted: false }),
    ]);

    // Recent activity (last 5 transactions)
    const recentActivity = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("item", "model brand")
      .populate("user", "name");

    // Format for dashboard
    const activity = recentActivity.map(tx => ({
      itemName: tx.item ? `${tx.item.brand} ${tx.item.model}` : "Unknown",
      action: tx.action === "checkout" ? "Checked Out" : "Checked In",
      user: tx.user ? tx.user.name : "Unknown",
      date: tx.createdAt.toISOString().slice(0, 10),
      status: tx.action === "checkout" ? "In-Use" : "Available",
    }));

    // Quick links (static)
    const quickLinks = [
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
    ];

    res.render("dashboard", {
      title: "Dashboard",
      user: req.user,
      displayName: req.user?.name || "User",
      stats: {
        totalUsers,
        totalItems,
        availableItems,
        deployedItems,
        maintenanceItems,
      },
      quickLinks,
      recentActivity: activity,
    });
  } catch (error) {
    next(error);
  }
}

// Export report as CSV
async function exportReport(req, res, next) {
  try {
    const type = req.params.type;
    let csv;
    if (type === 'summary') {
      const total = await Item.countDocuments({ isDeleted: false });
      const deployed = await Item.countDocuments({ isDeleted: false, status: 'In-Use' });
      const available = total - deployed;
      const data = [{ total, deployed, available }];
      const parser = new Parser({ fields: ['total', 'deployed', 'available'] });
      csv = parser.parse(data);
      res.attachment('inventory-summary.csv');
    } else if (type === 'aging') {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const items = await Item.find({ isDeleted: false, dateAcquired: { $lt: threeYearsAgo } });
      const data = items.map(item => ({
        name: item.name,
        dateAcquired: item.dateAcquired ? item.dateAcquired.toISOString().slice(0, 10) : '',
        status: item.status
      }));
      const parser = new Parser({ fields: ['name', 'dateAcquired', 'status'] });
      csv = parser.parse(data);
      res.attachment('asset-aging.csv');
    } else if (type === 'by-user') {
      const users = await User.find({ isDeleted: false });
      const items = await Item.find({ isDeleted: false }).populate('assignedTo', 'name email');
      let data = [];
      users.forEach(user => {
        const assigned = items.filter(item => item.assignedTo && item.assignedTo._id.equals(user._id));
        if (assigned.length === 0) {
          data.push({
            user: user.name,
            email: user.email,
            asset: '',
            status: ''
          });
        } else {
          assigned.forEach(item => {
            data.push({
              user: user.name,
              email: user.email,
              asset: item.name,
              status: item.status
            });
          });
        }
      });
      const parser = new Parser({ fields: ['user', 'email', 'asset', 'status'] });
      csv = parser.parse(data);
      res.attachment('assets-by-user.csv');
    } else {
      return res.status(400).send('Invalid report type');
    }
    res.type('text/csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

// Render Reports page with all data pre-loaded for modal popups
async function renderReportsPage(req, res, next) {
  try {
    // Summary
    const total = await Item.countDocuments({ isDeleted: false });
    const deployed = await Item.countDocuments({ isDeleted: false, status: "In-Use" });
    const available = total - deployed;

    // Aging (older than 3 years)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const agingItems = await Item.find({ isDeleted: false, dateAcquired: { $lt: threeYearsAgo } }).lean();

    // Assets by User
    const users = await User.find({ isDeleted: false }).lean();
    const allItems = await Item.find({ isDeleted: false }).populate("assignedTo", "name email").lean();
    const assetsByUser = users.map(user => ({
      user,
      items: allItems.filter(item => item.assignedTo && String(item.assignedTo._id) === String(user._id))
    }));

    res.render("reports", {
      title: "Reports",
      user: req.user,
      summary: { total, deployed, available },
      agingItems,
      assetsByUser
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummaryReport,
  getDashboardData,
  getOlderThanThreeYears,
  getAssetsByUser,
  renderSummaryReportPage,
  renderAgingReportPage,
  renderAssetsByUserReportPage,
  renderReportsPage,
  exportReport
};