const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");
const hashApiKey = require("../utils/hashApiKey");

async function createApiKey(req, res, next) {
  try {
    const rawKey = crypto.randomBytes(32).toString("hex");
    const keyHash = hashApiKey(rawKey);

    const apiKey = await ApiKey.create({
      name: req.body.name || "Default API Key",
      keyHash,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "API key created successfully",
      rawKey,
      data: apiKey,
    });
  } catch (error) {
    next(error);
  }
}

async function listApiKeys(req, res, next) {
  try {
    const keys = await ApiKey.find({ isRevoked: false }).populate("createdBy", "name email");

    res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    next(error);
  }
}

async function revokeApiKey(req, res, next) {
  try {
    const key = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { isRevoked: true },
      { new: true }
    );

    res.json({
      success: true,
      message: "API key revoked",
      data: key,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createApiKey,
  listApiKeys,
  revokeApiKey,
};