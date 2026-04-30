const multer = require("multer");
const os = require("os");
const path = require("path");
const fs = require("fs");

const avatarUploadDir = path.join(os.tmpdir(), "cis-uploads", "avatars");

if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarUploadDir);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName =
      path
        .basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "avatar";

    cb(null, `${Date.now()}-${baseName}${extension}`);
  },
});

function imageFileFilter(req, file, cb) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Please upload a JPG, PNG, GIF, or WebP image."), false);
}

const avatarUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = avatarUpload;
