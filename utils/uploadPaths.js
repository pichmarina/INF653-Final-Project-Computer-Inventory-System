const path = require("path");

function getStoredUploadPath(file) {
  if (!file) return "";

  const filename = file.filename || path.basename(file.path || "");
  return filename ? path.posix.join("uploads", filename) : "";
}

function getUploadUrl(uploadPath) {
  if (!uploadPath) return "";

  const normalizedPath = String(uploadPath).replace(/\\/g, "/");
  const uploadsPathIndex = normalizedPath.lastIndexOf("/uploads/");

  if (uploadsPathIndex >= 0) {
    return normalizedPath.slice(uploadsPathIndex + 1);
  }

  if (normalizedPath.startsWith("/uploads/")) {
    return normalizedPath.slice(1);
  }

  if (normalizedPath.startsWith("uploads/")) {
    return normalizedPath;
  }

  return normalizedPath.replace(/^\/+/, "");
}

function getUploadRelativePath(uploadPath) {
  const uploadUrl = getUploadUrl(uploadPath);
  if (!uploadUrl) return "";

  return uploadUrl.startsWith("uploads/")
    ? uploadUrl.slice("uploads/".length)
    : uploadUrl;
}

function getUploadFilename(uploadPath) {
  const uploadRelativePath = getUploadRelativePath(uploadPath);
  return uploadRelativePath ? path.basename(uploadRelativePath) : "";
}

function getUploadFilePath(uploadPath, uploadRoot) {
  const uploadRelativePath = getUploadRelativePath(uploadPath);
  return uploadRelativePath ? path.join(uploadRoot, uploadRelativePath) : "";
}

module.exports = {
  getUploadFilePath,
  getUploadFilename,
  getUploadRelativePath,
  getStoredUploadPath,
  getUploadUrl,
};
