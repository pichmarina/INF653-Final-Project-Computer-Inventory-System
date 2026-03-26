const express = require("express");
const router = express.Router();
const {
  createUser,
  updateUserRole,
  updateUserStatus,
} = require("../controllers/userController");
const { verifyJWT } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");

router.post("/", verifyJWT, requireAdmin, createUser);
router.patch("/:id/role", verifyJWT, requireAdmin, updateUserRole);
router.patch("/:id/status", verifyJWT, requireAdmin, updateUserStatus);

module.exports = router;