const express = require("express");
const router = express.Router();
const {
  getSummaryReport,
  getOlderThanThreeYears,
  getAssetsByUser,
} = require("../controllers/reportController");
const { verifyJWT } = require("../middleware/authMiddleware");

router.get("/summary", verifyJWT, getSummaryReport);
router.get("/older-than-3-years", verifyJWT, getOlderThanThreeYears);
router.get("/assigned-by-user", verifyJWT, getAssetsByUser);

module.exports = router;