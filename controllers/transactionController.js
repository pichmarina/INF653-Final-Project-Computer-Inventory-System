const Item = require("../models/Item");
const Transaction = require("../models/Transaction");

async function checkoutItem(req, res, next) {
  try {
    const { itemId, userId, notes } = req.body;

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    if (item.status === "Maintenance" || item.status === "Retired") {
      return res.status(400).json({
        success: false,
        message: "This item cannot be checked out",
      });
    }

    item.status = "In-Use";
    item.assignedTo = userId;
    await item.save();

    const transaction = await Transaction.create({
      item: item._id,
      user: userId,
      action: "checkout",
      documentPath: req.file ? `/uploads/${req.file.filename}` : null,
      notes,
      checkoutDate: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Item checked out successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

async function checkinItem(req, res, next) {
  try {
    const { itemId, userId, notes } = req.body;

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    item.status = "Available";
    item.assignedTo = null;
    await item.save();

    const transaction = await Transaction.create({
      item: item._id,
      user: userId,
      action: "checkin",
      documentPath: req.file ? `/uploads/${req.file.filename}` : null,
      notes,
      checkinDate: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Item checked in successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

async function getItemHistory(req, res, next) {
  try {
    const history = await Transaction.find({ item: req.params.itemId })
      .populate("item")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkoutItem,
  checkinItem,
  getItemHistory,
};