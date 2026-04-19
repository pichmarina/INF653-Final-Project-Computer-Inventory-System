const Item = require("../models/Item");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

async function getTransactionPageData(req) {
  const items = await Item.find({ isDeleted: false }).lean();
  const users = await User.find({}).lean();

  const availableItems = items.filter((item) => item.status === "Available");
  const inUseItems = items.filter((item) => item.status === "In-Use");

  return {
    title: "Check-Out / Check-In",
    user: req.user,
    users,
    availableItems,
    inUseItems,
  };
}

async function checkoutItem(req, res, next) {
  try {
    const { itemId, userId, notes } = req.body;

    if (!req.file) {
      const pageData = await getTransactionPageData(req);
      return res.status(400).render("transactions", {
        ...pageData,
        formError: "Upload document is required for check-out.",
      });
    }

    const item = await Item.findById(itemId);

    if (!item || item.isDeleted) {
      const pageData = await getTransactionPageData(req);
      return res.status(404).render("transactions", {
        ...pageData,
        formError: "Item not found.",
      });
    }

    if (item.status === "Maintenance" || item.status === "Retired") {
      const pageData = await getTransactionPageData(req);
      return res.status(400).render("transactions", {
        ...pageData,
        formError: "This item cannot be checked out.",
      });
    }

    if (item.status !== "Available") {
      const pageData = await getTransactionPageData(req);
      return res.status(400).render("transactions", {
        ...pageData,
        formError: "Item is not available for checkout.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      const pageData = await getTransactionPageData(req);
      return res.status(404).render("transactions", {
        ...pageData,
        formError: "User not found.",
      });
    }

    item.status = "In-Use";
    item.assignedTo = userId;
    await item.save();

    await Transaction.create({
      item: item._id,
      user: userId,
      action: "checkout",
      documentPath: req.file.path,
      notes,
      checkoutDate: new Date(),
    });

    return res.redirect("/transactions?success=checkout");
  } catch (error) {
    next(error);
  }
}

async function checkinItem(req, res, next) {
  try {
    const { itemId, notes } = req.body;

    if (!req.file) {
      const pageData = await getTransactionPageData(req);
      return res.status(400).render("transactions", {
        ...pageData,
        formError: "Upload document is required for check-in.",
      });
    }

    const item = await Item.findById(itemId);

    if (!item || item.isDeleted) {
      const pageData = await getTransactionPageData(req);
      return res.status(404).render("transactions", {
        ...pageData,
        formError: "Item not found.",
      });
    }

    if (item.status !== "In-Use") {
      const pageData = await getTransactionPageData(req);
      return res.status(400).render("transactions", {
        ...pageData,
        formError: "Only items currently in use can be checked in.",
      });
    }

    const checkedInUser = item.assignedTo;

    if (!checkedInUser) {
      const pageData = await getTransactionPageData(req);
      return res.status(400).render("transactions", {
        ...pageData,
        formError: "No assigned user found for this item.",
      });
    }

    item.status = "Available";
    item.assignedTo = null;
    await item.save();

    await Transaction.create({
      item: item._id,
      user: checkedInUser,
      action: "checkin",
      documentPath: req.file.path,
      notes,
      checkinDate: new Date(),
    });

    return res.redirect("/transactions?success=checkin");
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

async function renderHistoryPage(req, res, next) {
  try {
    const transactions = await Transaction.find({})
      .populate("item", "name brand model serialNumber")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const history = transactions.map((tx) => ({
      date: tx.createdAt ? tx.createdAt.toISOString().slice(0, 10) : "",
      time: tx.createdAt ? tx.createdAt.toTimeString().slice(0, 5) : "",
      itemName: tx.item ? `${tx.item.brand || ""} ${tx.item.model || ""}`.trim() || tx.item.name : "Unknown Item",
      serialNumber: tx.item ? tx.item.serialNumber || "" : "",
      action: tx.action === "checkout" ? "Checked Out" : "Checked In",
      actionClass: tx.action === "checkout" ? "badge-warning" : "badge-success",
      userName: tx.user ? tx.user.name : "Unknown User",
      userEmail: tx.user ? tx.user.email : "",
      notes: tx.notes || "",
      documentPath: tx.documentPath || "",
    }));

    res.render("history", {
      title: "Asset History",
      user: req.user,
      history,
      hasHistory: history.length > 0,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkoutItem,
  checkinItem,
  getItemHistory,
  renderHistoryPage,
};