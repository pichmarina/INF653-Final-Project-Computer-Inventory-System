const fs = require("fs/promises");
const path = require("path");
const {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const {
  getStoredUploadPath,
  getUploadFilename,
  getUploadUrl,
} = require("./uploadPaths");

const MIME_TYPES_BY_EXTENSION = {
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
};

let r2Client;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  return {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    bucketName: process.env.R2_BUCKET || process.env.R2_BUCKET_NAME,
    endpoint,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  };
}

function assertR2Config() {
  const config = getR2Config();

  if (
    !config.accessKeyId ||
    !config.bucketName ||
    !config.endpoint ||
    !config.secretAccessKey
  ) {
    throw new Error(
      "R2 storage is not configured. Set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }

  return config;
}

function getR2Client() {
  if (r2Client) return r2Client;

  const config = assertR2Config();

  r2Client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return r2Client;
}

async function saveUploadedDocument(file, userId) {
  if (!file || !file.path) return "";

  const storedPath = getStoredUploadPath(file);
  const body = await fs.readFile(file.path);

  await putDocumentObject({
    body,
    contentLength: file.size || body.length,
    contentType: file.mimetype || "application/octet-stream",
    key: storedPath,
    originalName: file.originalname || path.basename(file.path),
    userId,
  });

  await fs.unlink(file.path).catch(() => {});

  return storedPath;
}

async function saveLocalDocumentCopy(uploadPath, filePath, userId) {
  const storedPath = getUploadUrl(uploadPath);
  const filename = getUploadFilename(uploadPath);

  if (!storedPath || !filename || !filePath) return;

  const body = await fs.readFile(filePath);
  const extension = path.extname(filename).toLowerCase();

  await putDocumentObject({
    body,
    contentLength: body.length,
    contentType: MIME_TYPES_BY_EXTENSION[extension] || "application/octet-stream",
    key: storedPath,
    originalName: filename,
    userId,
  });
}

async function findUploadedDocument(uploadPath) {
  const key = getUploadUrl(uploadPath);

  if (!key) return null;

  const config = assertR2Config();

  try {
    const result = await getR2Client().send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    );

    return {
      body: result.Body,
      contentLength: result.ContentLength,
      mimeType: result.ContentType || "application/octet-stream",
      originalName:
        decodeURIComponent(result.Metadata?.originalname || "") ||
        getUploadFilename(key) ||
        path.basename(key),
    };
  } catch (error) {
    if (
      error?.name === "NoSuchKey" ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }

    throw error;
  }
}

async function putDocumentObject({
  body,
  contentLength,
  contentType,
  key,
  originalName,
  userId,
}) {
  const config = assertR2Config();
  const metadata = {
    originalname: encodeURIComponent(originalName || path.basename(key)),
  };

  if (userId) {
    metadata.uploadedby = String(userId);
  }

  await getR2Client().send(
    new PutObjectCommand({
      Body: body,
      Bucket: config.bucketName,
      ContentLength: contentLength,
      ContentType: contentType,
      Key: key,
      Metadata: metadata,
    }),
  );
}

module.exports = {
  findUploadedDocument,
  saveLocalDocumentCopy,
  saveUploadedDocument,
};
