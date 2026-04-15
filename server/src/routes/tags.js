const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const PdfDocument = require("../models/PdfDocument");
const env = require("../config/env");
const { normalizeTagName } = require("../utils/tagging");
const { buildPdfIdentity } = require("../utils/pdfIdentity");
const { ensureDir } = require("../utils/fileUtils");
const {
  createJob,
  getJob,
  updateJob,
  resetJobProcessingState,
} = require("../store/jobStore");
const { buildHtmlFromAnnotations } = require("../utils/buildHtml");
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

const normalizeAnnotations = (annotations) =>
  (Array.isArray(annotations) ? annotations : [])
    .map((annotation, index) => ({
      annotationId: String(
        annotation?.annotationId || annotation?.id || `annotation-${index + 1}`
      ),
      start: Number(annotation?.start),
      end: Number(annotation?.end),
      text: String(annotation?.text || "").trim(),
      textContent: String(annotation?.textContent || annotation?.text || "").trim(),
      tag: String(annotation?.tag || "").toLowerCase(),
      selectedTag: normalizeTagName(annotation?.selectedTag || annotation?.tag || ""),
    }))
    .filter(
      (annotation) =>
        Number.isFinite(annotation.start) &&
        Number.isFinite(annotation.end) &&
        annotation.end > annotation.start &&
        annotation.text.length > 0 &&
        annotation.tag.length > 0
    );

const buildPageRanges = (pageTexts = []) => {
  let cursor = 0;

  return pageTexts.map((pageText, index) => {
    const text = String(pageText || "");
    const range = {
      page: index + 1,
      text,
      start: cursor,
      end: cursor + text.length,
    };
    cursor = range.end + 2;
    return range;
  });
};

const mapAnnotationToPage = (annotation, pageRanges) => {
  const matchingPage =
    pageRanges.find(
      (pageRange) =>
        annotation.start < pageRange.end && annotation.end > pageRange.start
    ) || pageRanges[0];

  if (!matchingPage) {
    return {
      page: 1,
      pageStartOffset: annotation.start,
      pageEndOffset: annotation.end,
    };
  }

  return {
    page: matchingPage.page,
    pageStartOffset: Math.max(0, annotation.start - matchingPage.start),
    pageEndOffset: Math.max(0, annotation.end - matchingPage.start),
  };
};

const enrichAnnotations = (annotations, document, jobId) => {
  const pageRanges = buildPageRanges(document.pageTexts || []);

  return annotations.map((annotation) => {
    const pageMeta = mapAnnotationToPage(annotation, pageRanges);

    return {
      annotationId: annotation.annotationId,
      start: annotation.start,
      end: annotation.end,
      text: annotation.text,
      tag: annotation.tag,
      selectedTag: annotation.selectedTag || normalizeTagName(annotation.tag),
      textContent: annotation.textContent || annotation.text,
      page: pageMeta.page,
      startOffset: annotation.start,
      endOffset: annotation.end,
      pageStartOffset: pageMeta.pageStartOffset,
      pageEndOffset: pageMeta.pageEndOffset,
      fileHash: document.fileHash || "",
      pdfFingerprint: document.pdfFingerprint || "",
      jobId,
    };
  });
};

const ensureLinkedJob = async (document) => {
  const pdfIdentity = buildPdfIdentity({
    filename: document.filename,
    fileSize: document.fileSize,
    pageCount: document.pageCount,
    fileHash: document.fileHash,
  });
  const existingJob = document.linkedJobId ? getJob(document.linkedJobId) : null;

  if (existingJob) {
    updateJob(existingJob.id, (job) =>
      resetJobProcessingState({
        ...job,
        sourceDocumentId: String(document._id),
        pdfIdentity,
      })
    );

    return existingJob.id;
  }

  const linkedJobId = document.linkedJobId || uuidv4();
  const workspacePath = path.join(env.tempDir, linkedJobId);
  const fileStats = await fs.stat(document.filePath).catch(() => ({ size: 0 }));
  await ensureDir(workspacePath);

  createJob({
    id: linkedJobId,
    file: {
      originalname: document.filename,
      mimetype: "application/pdf",
      size: fileStats.size || 0,
    },
    uploadPath: document.filePath,
    workspacePath,
    sourceDocumentId: String(document._id),
    pdfIdentity,
  });

  if (document.linkedJobId !== linkedJobId) {
    document.linkedJobId = linkedJobId;
  }

  return linkedJobId;
};

router.post("/save-tags", async (req, res, next) => {
  try {
    ensureDatabaseConnection();

    const { docId, annotations } = req.body || {};

    if (!docId) {
      throw new AppError("docId is required.", 400);
    }

    const document = await PdfDocument.findById(docId);

    if (!document) {
      throw new AppError("Document not found.", 404);
    }

    const cleanedAnnotations = normalizeAnnotations(annotations);
    const generatedHtml = buildHtmlFromAnnotations(
      document.rawText,
      cleanedAnnotations
    );

    const jobId = await ensureLinkedJob(document);
    const enrichedAnnotations = enrichAnnotations(cleanedAnnotations, document, jobId);
    document.annotations = enrichedAnnotations;
    document.generatedHtml = generatedHtml;
    document.updatedAt = new Date();
    await document.save();

    sendLeometricResponse(res, {
      message: "Annotations saved and HTML generated.",
      data: {
        success: true,
        docId: document._id,
        jobId,
        annotationCount: enrichedAnnotations.length,
        generatedHtml,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/documents", async (_req, res, next) => {
  try {
    ensureDatabaseConnection();

    const documents = await PdfDocument.find({})
      .sort({ updatedAt: -1 })
      .limit(25)
      .select(
        "_id filename createdAt updatedAt generatedHtml annotations fileHash pdfFingerprint pageCount"
      );

    sendLeometricResponse(res, {
      message: "Documents fetched.",
      data: {
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/documents/:docId", async (req, res, next) => {
  try {
    ensureDatabaseConnection();

    const document = await PdfDocument.findById(req.params.docId);

    if (!document) {
      throw new AppError("Document not found.", 404);
    }

    sendLeometricResponse(res, {
      message: "Document fetched.",
      data: {
        document,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
