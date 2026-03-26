const Item = require("../models/Item");

async function getSummaryReport(req, res, next) {
  try {
    const total = await Item.countDocuments({ isDeleted: false });
    const deployed = await Item.countDocuments({
      isDeleted: false,
      status: "In-Use",
    });

    res.json({
      success: true,
      data: {
        total,
        deployed,
        available: total - deployed,
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

module.exports = {
  getSummaryReport,
  getOlderThanThreeYears,
  getAssetsByUser,
};