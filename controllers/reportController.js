const Item = require("../models/Item");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getItemDisplayName } = require("../utils/itemDisplayName");
const { Parser } = require('json2csv');

function getAssetAgeLabel(dateAcquired, now = new Date()) {
  if (!dateAcquired) return "-";

  const acquired = new Date(dateAcquired);
  if (Number.isNaN(acquired.getTime())) return "-";

  let months =
    (now.getFullYear() - acquired.getFullYear()) * 12 +
    (now.getMonth() - acquired.getMonth());

  if (now.getDate() < acquired.getDate()) {
    months -= 1;
  }

  months = Math.max(months, 0);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0 && remainingMonths > 0) {
    return `${years}y ${remainingMonths}m`;
  }

  if (years > 0) return `${years}y`;
  return `${remainingMonths}m`;
}

async function getSummaryReport(req, res, next) {
  try {
    const [total, deployed, available, maintenance, retired] = await Promise.all([
      Item.countDocuments({ isDeleted: false }),
      Item.countDocuments({ isDeleted: false, status: "In-Use" }),
      Item.countDocuments({ isDeleted: false, status: "Available" }),
      Item.countDocuments({ isDeleted: false, status: "Maintenance" }),
      Item.countDocuments({ isDeleted: false, status: "Retired" }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        deployed,
        available,
        maintenance,
        retired,
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
    if (!req.query.userId) {
      return res.status(400).json({
        success: false,
        message: "userId query parameter is required",
      });
    }

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
  return renderReportsPage(req, res, next);
}

// Render Asset Aging Report
async function renderAgingReportPage(req, res, next) {
  return renderReportsPage(req, res, next);
}

// Render Assets by User Report
async function renderAssetsByUserReportPage(req, res, next) {
  return renderReportsPage(req, res, next);
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
      itemName: tx.item ? getItemDisplayName(tx.item) : "Unknown",
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
      const available = await Item.countDocuments({ isDeleted: false, status: 'Available' });
      const maintenance = await Item.countDocuments({ isDeleted: false, status: 'Maintenance' });
      const retired = await Item.countDocuments({ isDeleted: false, status: 'Retired' });
      const data = [{ total, deployed, available, maintenance, retired }];
      const parser = new Parser({ fields: ['total', 'deployed', 'available', 'maintenance', 'retired'] });
      csv = parser.parse(data);
      res.attachment('inventory-summary.csv');
    } else if (type === 'aging') {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const items = await Item.find({ isDeleted: false, dateAcquired: { $lt: threeYearsAgo } });
      const data = items.map(item => ({
        asset: getItemDisplayName(item),
        itemId: item.itemId,
        serialNumber: item.serialNumber,
        age: getAssetAgeLabel(item.dateAcquired),
        dateAcquired: item.dateAcquired ? item.dateAcquired.toISOString().slice(0, 10) : '',
        status: item.status
      }));
      const parser = new Parser({ fields: ['asset', 'itemId', 'serialNumber', 'age', 'dateAcquired', 'status'] });
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
            itemId: '',
            status: ''
          });
        } else {
          assigned.forEach(item => {
            data.push({
              user: user.name,
              email: user.email,
              asset: getItemDisplayName(item),
              itemId: item.itemId,
              status: item.status
            });
          });
        }
      });
      const parser = new Parser({ fields: ['user', 'email', 'asset', 'itemId', 'status'] });
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
    const [total, deployed, available, maintenance, retired] = await Promise.all([
      Item.countDocuments({ isDeleted: false }),
      Item.countDocuments({ isDeleted: false, status: "In-Use" }),
      Item.countDocuments({ isDeleted: false, status: "Available" }),
      Item.countDocuments({ isDeleted: false, status: "Maintenance" }),
      Item.countDocuments({ isDeleted: false, status: "Retired" }),
    ]);

    // Aging (older than 3 years)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const agingItems = await Item.find({ isDeleted: false, dateAcquired: { $lt: threeYearsAgo } }).lean();

    // Assets by User
    const users = await User.find({ isDeleted: false }).lean();
    const allItems = await Item.find({ isDeleted: false }).populate("assignedTo", "name email").lean();
    const assetsByUser = users.map(user => ({
      user,
      items: allItems
        .filter(item => item.assignedTo && String(item.assignedTo._id) === String(user._id))
        .map((item) => ({
          ...item,
          displayName: getItemDisplayName(item),
        }))
    }));

    res.render("reports", {
      title: "Reports",
      user: req.user,
      summary: { total, deployed, available, maintenance, retired },
      agingItems: agingItems.map((item) => ({
        ...item,
        displayName: getItemDisplayName(item),
        ageLabel: getAssetAgeLabel(item.dateAcquired),
      })),
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
