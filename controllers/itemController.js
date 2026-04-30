const Item = require("../models/Item");
const { getItemDisplayName } = require("../utils/itemDisplayName");
const { saveUploadedDocument } = require("../utils/documentStorage");

function wantsJsonResponse(req) {
  const accept = req.get("accept") || "";
  return req.is("application/json") || accept.includes("application/json");
}

async function getItems(req, res, next) {
  try {
    const items = await Item.find({ isDeleted: false }).populate(
      "assignedTo",
      "name email",
    );

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

async function getItemById(req, res, next) {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("assignedTo", "name email");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

async function createItem(req, res, next) {
  try {
    const itemData = {
      ...req.body,
      status: "Available",
    };

    if (req.file) {
      itemData.uploadPath = await saveUploadedDocument(req.file, req.user?._id);
    }

    const item = await Item.create(itemData);

    if (wantsJsonResponse(req)) {
      return res.status(201).json({
        success: true,
        message: "Item created successfully",
        data: item,
      });
    }

    return res.redirect("/inventory?success=added");
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.itemId) {
      return res.status(400).render("item-form", {
        title: "Add Item",
        isEdit: false,
        user: req.user,
        item: { ...req.body },
        formError: "Item ID already exists. Please use a different Item ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).render("item-form", {
        title: "Add Item",
        isEdit: false,
        user: req.user,
        item: { ...req.body },
        formError: "Please fill in all required fields.",
      });
    }

    next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const updateData = req.body;

    const currentItem = await Item.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!currentItem) {
      if (wantsJsonResponse(req)) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      return res.status(404).render("404", {
        title: "404 - Item Not Found",
        user: req.user,
      });
    }

    // Cannot manually change status while checked out
    if (currentItem.status === "In-Use" && updateData.status && updateData.status !== "In-Use") {
      return res.status(400).render("item-form", {
        title: "Edit Item",
        isEdit: true,
        itemId: req.params.id,
        user: req.user,
        item: {
          ...currentItem.toObject(),
          ...req.body,
          dateAcquired: currentItem.dateAcquired
            ? new Date(currentItem.dateAcquired).toISOString().split("T")[0]
            : "",
        },
        formError: "Status cannot be changed while the item is checked out.",
      });
    }

    // Admin may never manually force In-Use
    if (updateData.status === "In-Use" && currentItem.status !== "In-Use") {
      return res.status(400).render("item-form", {
        title: "Edit Item",
        isEdit: true,
        itemId: req.params.id,
        user: req.user,
        item: {
          ...currentItem.toObject(),
          ...req.body,
          dateAcquired: currentItem.dateAcquired
            ? new Date(currentItem.dateAcquired).toISOString().split("T")[0]
            : "",
        },
        formError: "In-Use is controlled automatically by check-out.",
      });
    }

    if (req.file) {
      updateData.uploadPath = await saveUploadedDocument(req.file, req.user?._id);
    }

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!item) {
      if (wantsJsonResponse(req)) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      return res.status(404).render("404", {
        title: "404 - Item Not Found",
        user: req.user,
      });
    }

    if (wantsJsonResponse(req)) {
      return res.json({
        success: true,
        message: "Item updated successfully",
        data: item,
      });
    }

    return res.redirect("/inventory?success=updated");
  } catch (error) {
    const item = await Item.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("assignedTo", "name email").lean();

    if (item && item.dateAcquired) {
      item.dateAcquired = new Date(item.dateAcquired).toISOString().split("T")[0];
    }

    if (error.code === 11000 && error.keyPattern && error.keyPattern.itemId) {
      return res.status(400).render("item-form", {
        title: "Edit Item",
        isEdit: true,
        itemId: req.params.id,
        user: req.user,
        item: {
          ...item,
          ...req.body,
        },
        formError: "Item ID already exists. Please use a different Item ID.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).render("item-form", {
        title: "Edit Item",
        isEdit: true,
        itemId: req.params.id,
        user: req.user,
        item: {
          ...item,
          ...req.body,
        },
        formError: "Please fill in all required fields.",
      });
    }

    next(error);
  }
}

async function softDeleteItem(req, res, next) {
  try {
    if (!req.user || req.user.role !== "Admin") {
      if (wantsJsonResponse(req)) {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      return res.status(403).render("error", {
        title: "Access Denied",
        message: "Admin access required",
        user: req.user,
      });
    }

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    if (wantsJsonResponse(req)) {
      return res.json({
        success: true,
        message: "Item removed successfully",
        data: item,
      });
    }

    return res.redirect("/inventory?success=deleted");
  } catch (error) {
    next(error);
  }
}

const renderItemsPage = async (req, res, next) => {
  try {
    const items = await Item.find({ isDeleted: false })
      .populate("assignedTo", "name email")
      .lean();

    res.render("inventory", {
      title: "Inventory Management",
      user: req.user,
      items: items.map((item) => ({
        ...item,
        displayName: getItemDisplayName(item),
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  softDeleteItem,
  renderItemsPage,
};
