const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");
const hashApiKey = require("../utils/hashApiKey");

function wantsJsonResponse(req) {
  const accept = req.get("accept") || "";
  return req.is("application/json") || accept.includes("application/json");
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function serializeApiKey(key) {
  const keyObject = key.toObject ? key.toObject() : key;

  return {
    _id: keyObject._id,
    name: keyObject.name,
    createdBy: keyObject.createdBy,
    isRevoked: keyObject.isRevoked,
    createdAt: keyObject.createdAt,
    updatedAt: keyObject.updatedAt,
    shortHash: keyObject.keyHash ? `${keyObject.keyHash.slice(0, 12)}...` : "",
  };
}

async function buildKeysViewData(query = {}, extras = {}) {
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
    rawKey: extras.rawKey || null,
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

    if (wantsJsonResponse(req)) {
      return res.status(201).json({
        success: true,
        message: "API key created successfully. Copy this value now; it will not be shown again.",
        data: {
          name,
          apiKey: rawKey,
        },
      });
    }

    const viewData = await buildKeysViewData(
      { success: "API key created successfully" },
      { rawKey },
    );
    viewData.user = req.user;
    return res.status(201).render("keys", viewData);
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
      data: keys.map(serializeApiKey),
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
      if (wantsJsonResponse(req)) {
        return res.status(404).json({
          success: false,
          message: "API key not found",
        });
      }

      return res.redirect("/keys?error=API key not found");
    }

    if (wantsJsonResponse(req)) {
      return res.json({
        success: true,
        message: "API key revoked",
        data: serializeApiKey(key),
      });
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
