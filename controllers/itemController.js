const Item = require("../models/Item");
const { getStoredUploadPath } = require("../utils/uploadPaths");

async function getItems(req, res, next) {
  try {
    const items = await Item.find({ isDeleted: false }).populate("assignedTo", "name email");

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
    const itemData = req.body;

    if (req.file) {
      itemData.uploadPath = getStoredUploadPath(req.file);
    }

    await Item.create(itemData);

    return res.redirect("/inventory?success=added");
  } catch (error) {
    next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const updateData = req.body;

    if (req.file) {
      updateData.uploadPath = getStoredUploadPath(req.file);
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
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.redirect("/inventory?success=updated");
  } catch (error) {
    next(error);
  }
}

async function softDeleteItem(req, res, next) {
  try {
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
      items,
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
