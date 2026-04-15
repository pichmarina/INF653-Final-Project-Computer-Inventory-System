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
const upload = require("../middleware/uploadMiddleware");

router.get("/", verifyJWT, getItems);
router.get("/:id", verifyJWT, getItemById);
router.post("/", verifyJWT, upload.single("document"), createItem);
router.put("/:id", verifyJWT, upload.single("document"), updateItem);
router.delete("/:id", verifyJWT, requireAdmin, softDeleteItem);

module.exports = router;