const express = require("express");
const router = express.Router();
const {
  checkoutItem,
  checkinItem,
  getItemHistory,
} = require("../controllers/transactionController");
const { verifyJWT } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/checkout", verifyJWT, upload.single("document"), checkoutItem);
router.post("/checkin", verifyJWT, upload.single("document"), checkinItem);
router.get("/item/:itemId/history", verifyJWT, getItemHistory);

module.exports = router;