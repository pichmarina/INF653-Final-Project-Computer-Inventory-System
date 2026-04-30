const express = require("express");
const router = express.Router();
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  softDeleteItem,
} = require("../controllers/itemController");
const { getItemHistory } = require("../controllers/transactionController");
const { verifyJWT } = require("../middleware/authMiddleware");
const { verifyApiKey } = require("../middleware/apiKeyMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

function verifyJwtOrApiKey(req, res, next) {
  if (req.headers.authorization || req.cookies?.token) {
    return verifyJWT(req, res, next);
  }

  return verifyApiKey(req, res, next);
}

router.get("/", verifyJwtOrApiKey, getItems);
router.get("/:itemId/history", verifyJWT, getItemHistory);
router.get("/:id", verifyJWT, getItemById);
router.post("/", verifyJWT, upload.single("document"), createItem);
router.put("/:id", verifyJWT, upload.single("document"), updateItem);
router.delete("/:id", verifyJWT, requireAdmin, softDeleteItem);

module.exports = router;
