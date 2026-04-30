const Item = require("../models/Item");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getItemDisplayName } = require("../utils/itemDisplayName");
const fs = require("fs/promises");
const path = require("path");
const {
  getUploadUrl,
} = require("../utils/uploadPaths");
const { saveUploadedDocument } = require("../utils/documentStorage");

const ALLOWED_TRANSACTION_DOC_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
]);

function wantsJsonResponse(req) {
  const accept = req.get("accept") || "";
  return req.is("application/json") || accept.includes("application/json");
}

function formatDuration(startDate, endDate) {
  if (!startDate || !endDate) return "-";

  const durationMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  if (!Number.isFinite(durationMs) || durationMs < 0) return "-";

  const totalHours = Math.max(Math.floor(durationMs / (1000 * 60 * 60)), 0);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;

  const minutes = Math.max(Math.floor(durationMs / (1000 * 60)), 0);
  return minutes > 0 ? `${minutes}m` : "Less than 1m";
}

function getSuccessMessage(query = {}) {
  if (query.success === "checkout") return "Item checked out successfully.";
  if (query.success === "checkin") return "Item checked in successfully.";
  return null;
}

async function getTransactionPageData(req) {
  const items = await Item.find({ isDeleted: false }).lean();
  const users = await User.find({ isDeleted: false, isEnabled: true }).lean();

  const availableItems = items.filter((item) => item.status === "Available");
  const inUseItems = items.filter((item) => item.status === "In-Use");

  return {
    title: "Check-Out / Check-In",
    user: req.user,
    users,
    availableItems,
    inUseItems,
    availableCount: availableItems.length,
    inUseCount: inUseItems.length,
    successMessage: getSuccessMessage(req.query),
  };
}

function getCheckoutFormState(body = {}) {
  return {
    itemId: body.itemId || "",
    userId: body.userId || "",
    notes: body.notes || "",
  };
}

function getCheckinFormState(body = {}) {
  return {
    itemId: body.itemId || "",
    notes: body.notes || "",
  };
}

async function deleteUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore file cleanup errors to avoid masking validation responses.
  }
}

function isSupportedTransactionDocument(file) {
  if (!file || !file.originalname) {
    return false;
  }

  const extension = path.extname(file.originalname).toLowerCase();
  return ALLOWED_TRANSACTION_DOC_EXTENSIONS.has(extension);
}

async function renderTransactionError(req, res, statusCode, formError, scope) {
  if (wantsJsonResponse(req)) {
    return res.status(statusCode).json({
      success: false,
      message: formError,
    });
  }

  const pageData = await getTransactionPageData(req);

  return res.status(statusCode).render("transactions", {
    ...pageData,
    formError,
    errorScope: scope,
    checkoutForm:
      scope === "checkout" ? getCheckoutFormState(req.body) : undefined,
    checkinForm:
      scope === "checkin" ? getCheckinFormState(req.body) : undefined,
  });
}

async function checkoutItem(req, res, next) {
  try {
    const { itemId, userId, notes } = req.body;

    if (!itemId || !userId) {
      await deleteUploadedFile(req.file?.path);
      return renderTransactionError(
        req,
        res,
        400,
        "Item and user are required for check-out.",
        "checkout",
      );
    }

    if (!req.file) {
      return renderTransactionError(
        req,
        res,
        400,
        "Reference document upload is required for check-out.",
        "checkout",
      );
    }

    if (!isSupportedTransactionDocument(req.file)) {
      await deleteUploadedFile(req.file.path);
      return renderTransactionError(
        req,
        res,
        400,
        "Reference document must be PDF, DOC, DOCX, JPG, JPEG, or PNG.",
        "checkout",
      );
    }

    const item = await Item.findById(itemId);

    if (!item || item.isDeleted) {
      await deleteUploadedFile(req.file.path);
      return renderTransactionError(
        req,
        res,
        404,
        "Item not found.",
        "checkout",
      );
    }

    if (item.status === "Maintenance" || item.status === "Retired") {
      await deleteUploadedFile(req.file.path);
      return renderTransactionError(
        req,
        res,
        400,
        "This item cannot be checked out.",
        "checkout",
      );
    }

    if (item.status !== "Available") {
      await deleteUploadedFile(req.file.path);
      return renderTransactionError(
        req,
        res,
        400,
        "Item is not available for check-out.",
        "checkout",
      );
    }

    const user = await User.findById(userId);

    if (!user || user.isDeleted || !user.isEnabled) {
      await deleteUploadedFile(req.file.path);
      return renderTransactionError(
        req,
        res,
        404,
        "User not found or is disabled.",
        "checkout",
      );
    }

    item.status = "In-Use";
    item.assignedTo = userId;
    await item.save();

    const transaction = await Transaction.create({
      item: item._id,
      user: userId,
      action: "checkout",
      documentPath: await saveUploadedDocument(req.file, req.user?._id),
      notes,
      checkoutDate: new Date(),
    });

    if (wantsJsonResponse(req)) {
      return res.status(201).json({
        success: true,
        message: "Item checked out successfully",
        data: {
          item,
          transaction,
        },
      });
    }

    return res.redirect("/transactions?success=checkout");
  } catch (error) {
    next(error);
  }
}

async function checkinItem(req, res, next) {
  try {
    const { itemId, notes } = req.body;

    if (!itemId) {
      await deleteUploadedFile(req.file?.path);
      return renderTransactionError(
        req,
        res,
        400,
        "Item is required for check-in.",
        "checkin",
      );
    }

    if (!req.file) {
      return renderTransactionError(
        req,
        res,
        400,
        "Return inspection document upload is required for check-in.",
        "checkin",
      );
    }

    if (!isSupportedTransactionDocument(req.file)) {
      await deleteUploadedFile(req.file.path);
      return renderTransactionError(
        req,
        res,
        400,
        "Return inspection document must be PDF, DOC, DOCX, JPG, JPEG, or PNG.",
        "checkin",
      );
    }

    const item = await Item.findById(itemId);

    if (!item || item.isDeleted) {
      await deleteUploadedFile(req.file.path);
      return renderTransactionError(
        req,
        res,
        404,
        "Item not found.",
        "checkin",
      );
    }

    if (item.status !== "In-Use") {
      await deleteUploadedFile(req.file.path);
      return renderTransactionError(
        req,
        res,
        400,
        "Only items currently in use can be checked in.",
        "checkin",
      );
    }

    const checkedInUser = item.assignedTo;

    if (!checkedInUser) {
      await deleteUploadedFile(req.file.path);
      return renderTransactionError(
        req,
        res,
        400,
        "No assigned user found for this item.",
        "checkin",
      );
    }

    item.status = "Available";
    item.assignedTo = null;
    await item.save();

    const transaction = await Transaction.create({
      item: item._id,
      user: checkedInUser,
      action: "checkin",
      documentPath: await saveUploadedDocument(req.file, req.user?._id),
      notes,
      checkinDate: new Date(),
    });

    if (wantsJsonResponse(req)) {
      return res.status(201).json({
        success: true,
        message: "Item checked in successfully",
        data: {
          item,
          transaction,
        },
      });
    }

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
      .populate("item", "itemId brand model serialNumber")
      .populate("user", "name email")
      .sort({ createdAt: 1 });

    const openCheckouts = new Map();
    const durationByTransactionId = new Map();

    transactions.forEach((tx) => {
      const itemId = tx.item?._id ? tx.item._id.toString() : "";
      const userId = tx.user?._id ? tx.user._id.toString() : "";
      const pairKey = `${itemId}:${userId}`;

      if (tx.action === "checkout") {
        openCheckouts.set(pairKey, tx);
        return;
      }

      const checkoutTx = openCheckouts.get(pairKey);
      if (!checkoutTx) return;

      durationByTransactionId.set(
        tx._id.toString(),
        `Returned after ${formatDuration(
          checkoutTx.checkoutDate || checkoutTx.createdAt,
          tx.checkinDate || tx.createdAt,
        )}`,
      );
      durationByTransactionId.set(checkoutTx._id.toString(), "Checkout recorded");
      openCheckouts.delete(pairKey);
    });

    openCheckouts.forEach((checkoutTx) => {
      durationByTransactionId.set(
        checkoutTx._id.toString(),
        `In use for ${formatDuration(checkoutTx.checkoutDate || checkoutTx.createdAt, new Date())}`,
      );
    });

    const history = transactions.reverse().map((tx) => {
      const transactionId = tx._id ? tx._id.toString() : "";
      const fallbackDuration =
        tx.action === "checkout"
          ? `In use for ${formatDuration(tx.checkoutDate || tx.createdAt, new Date())}`
          : "Return recorded";

      const durationLabel =
        durationByTransactionId.get(transactionId) || fallbackDuration;

      return {
        transactionId,
        date: tx.createdAt ? tx.createdAt.toISOString().slice(0, 10) : "",
        time: tx.createdAt ? tx.createdAt.toTimeString().slice(0, 5) : "",
        itemName: tx.item
          ? getItemDisplayName(tx.item)
          : "Unknown Item",
        serialNumber: tx.item ? tx.item.serialNumber || "" : "",
        action: tx.action === "checkout" ? "Checked Out" : "Checked In",
        actionClass: tx.action === "checkout" ? "badge-warning" : "badge-success",
        userName: tx.user ? tx.user.name : "Unknown User",
        userEmail: tx.user ? tx.user.email : "",
        duration: durationLabel,
        durationLabel,
        notes: tx.notes || "",
        documentPath: getUploadUrl(tx.documentPath),
        documentUrl: transactionId ? `/documents/transactions/${transactionId}` : "",
      };
    });

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
