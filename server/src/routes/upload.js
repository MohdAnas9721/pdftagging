const path = require("path");
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const PdfDocument = require("../models/PdfDocument");
const env = require("../config/env");
const { extractRawText } = require("../utils/extractText");
const { buildPdfIdentity, computeFileHash } = require("../utils/pdfIdentity");
const { ensureDir } = require("../utils/fileUtils");
const { createJob } = require("../store/jobStore");
const { AppError } = require("../utils/apiResponse");
const { sendLeometricResponse } = require("../utils/leometricResponse");

const router = express.Router();

const ensureDatabaseConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError(
      "MongoDB is not connected. Update MONGODB_URI and restart the server.",
      503
    );
  }
};

const sanitizeFilename = (filename) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, env.uploadDir);
  },
  filename: (_req, file, callback) => {
    callback(
      null,
      `${Date.now()}-${sanitizeFilename(path.basename(file.originalname))}`
    );
  },
});

const fileFilter = (_req, file, callback) => {
  const isPdf =
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    callback(new AppError("Only PDF files are supported.", 400));
    return;
  }

  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
  },
});

router.post("/", upload.single("pdf"), async (req, res, next) => {
  try {
    ensureDatabaseConnection();

    if (!req.file) {
      throw new AppError("PDF file is required.", 400);
    }

    const fileHash = await computeFileHash(req.file.path);
    const { rawText, pageCount, pageTexts } = await extractRawText(req.file.path);
    const pdfIdentity = buildPdfIdentity({
      filename: req.file.originalname,
      fileSize: req.file.size,
      pageCount,
      fileHash,
    });
    const jobId = uuidv4();
    const workspacePath = path.join(env.tempDir, jobId);
    await ensureDir(workspacePath);
    const document = await PdfDocument.create({
      filename: req.file.originalname,
      filePath: req.file.path,
      fileHash: pdfIdentity.fileHash,
      pdfFingerprint: pdfIdentity.pdfFingerprint,
      normalizedFilename: pdfIdentity.normalizedFilename,
      fileSize: pdfIdentity.fileSize,
      pageCount: pdfIdentity.pageCount,
      rawText,
      pageTexts,
      linkedJobId: jobId,
    });
    createJob({
      id: jobId,
      file: req.file,
      uploadPath: req.file.path,
      workspacePath,
      sourceDocumentId: String(document._id),
      pdfIdentity,
    });

    sendLeometricResponse(res, {
      statusCode: 201,
      message: "PDF uploaded and raw text extracted.",
      data: {
        docId: document._id,
        jobId,
        rawText,
        filename: document.filename,
        pageCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
