const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");
const hashApiKey = require("../utils/hashApiKey");

async function renderKeysPage(req, res, next) {
  try {
    const keys = await ApiKey.find({ isRevoked: false })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.render("keys", {
      title: "API Key Management",
      keys,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null,
      rawKey: req.query.rawKey || null,
    });
  } catch (error) {
    next(error);
  }
}

async function createApiKey(req, res, next) {
  try {
    const name = req.body.name ? req.body.name.trim() : "Default API Key";

    const rawKey = crypto.randomBytes(32).toString("hex");
    const keyHash = hashApiKey(rawKey);

    await ApiKey.create({
      name,
      keyHash,
      createdBy: req.user._id,
    });

    return res.redirect(
      `/keys?success=API key created successfully&rawKey=${encodeURIComponent(rawKey)}`
    );
  } catch (error) {
    next(error);
  }
}

async function listApiKeys(req, res, next) {
  try {
    const keys = await ApiKey.find({ isRevoked: false })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json({
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

    if (!key) {
      return res.redirect("/keys?error=API key not found");
    }

    return res.redirect("/keys?success=API key revoked");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderKeysPage,
  createApiKey,
  listApiKeys,
  revokeApiKey,
};