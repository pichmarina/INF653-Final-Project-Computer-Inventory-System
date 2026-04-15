const Item = require("../models/Item");

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
      itemData.uploadPath = req.file.path;
    }

    const item = await Item.create(itemData);

    res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const updateData = req.body; 

    if (req.file) {
      updateData.uploadPath = req.file.path;
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

    res.json({
      success: true,
      message: "Item updated successfully",
      data: item,
    });
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

    res.json({
      success: true,
      message: "Item soft deleted",
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  softDeleteItem,
};