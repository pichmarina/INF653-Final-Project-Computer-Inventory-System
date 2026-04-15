const express = require("express");
const router = express.Router();
const { verifyApiKey } = require("../middleware/apiKeyMiddleware");

router.get("/ping", verifyApiKey, (req, res) => {
  res.json({
    success: true,
    message: "API key is valid",
    data: {
      apiKeyId: req.apiKey._id,
      name: req.apiKey.name,
    },
  });
});

module.exports = router;