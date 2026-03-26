const ApiKey = require("../models/ApiKey");
const hashApiKey = require("../utils/hashApiKey");

async function verifyApiKey(req, res, next) {
  try {
    const rawKey = req.header("x-api-key");

    if (!rawKey) {
      return res.status(401).json({
        success: false,
        message: "API key is required",
      });
    }

    const hashed = hashApiKey(rawKey);

    const apiKey = await ApiKey.findOne({
      keyHash: hashed,
      isRevoked: false,
    });

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "Invalid or revoked API key",
      });
    }

    req.apiKey = apiKey;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { verifyApiKey };