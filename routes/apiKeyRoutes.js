const express = require("express");
const router = express.Router();
const {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} = require("../controllers/apiKeyController");
const { verifyJWT } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");

router.post("/", verifyJWT, requireAdmin, createApiKey);
router.get("/", verifyJWT, requireAdmin, listApiKeys);
router.delete("/:id", verifyJWT, requireAdmin, revokeApiKey);

module.exports = router;