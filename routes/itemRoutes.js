const express = require("express");
const router = express.Router();
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  softDeleteItem,
} = require("../controllers/itemController");
const { verifyJWT } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");

router.get("/", verifyJWT, getItems);
router.get("/:id", verifyJWT, getItemById);
router.post("/", verifyJWT, createItem);
router.put("/:id", verifyJWT, updateItem);
router.delete("/:id", verifyJWT, requireAdmin, softDeleteItem);

module.exports = router;