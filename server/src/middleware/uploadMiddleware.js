const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");
const { AppError } = require("../utils/apiResponse");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.uploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || ".pdf";
    cb(null, `${uuidv4()}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const isPdf =
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    cb(new AppError("Only PDF files are supported.", 400));
    return;
  }

  cb(null, true);
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
  },
});

module.exports = uploadMiddleware;
