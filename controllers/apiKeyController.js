const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");
const hashApiKey = require("../utils/hashApiKey");

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

async function buildKeysViewData(query = {}) {
  const keyDocs = await ApiKey.find({ isRevoked: false })
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 });

  const keys = keyDocs.map((key) => ({
    ...key.toObject(),
    createdAtLabel: formatDate(key.createdAt),
    shortHash: key.keyHash.slice(0, 12),
  }));

  return {
    title: "API Key Management",
    keys,
    keyCount: keys.length,
    successMessage: query.success || null,
    errorMessage: query.error || null,
    rawKey: query.rawKey || null,
  };
}

async function renderKeysPage(req, res, next) {
  try {
    const viewData = await buildKeysViewData(req.query);
    return res.render("keys", viewData);
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