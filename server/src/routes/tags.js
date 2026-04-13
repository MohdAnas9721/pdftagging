const express = require("express");
const mongoose = require("mongoose");
const PdfDocument = require("../models/PdfDocument");
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
    .map((annotation) => ({
      start: Number(annotation?.start),
      end: Number(annotation?.end),
      text: String(annotation?.text || ""),
      tag: String(annotation?.tag || "").toLowerCase(),
    }))
    .filter(
      (annotation) =>
        Number.isFinite(annotation.start) &&
        Number.isFinite(annotation.end) &&
        annotation.end > annotation.start &&
        annotation.text.length > 0 &&
        annotation.tag.length > 0
    );

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

    document.annotations = cleanedAnnotations;
    document.generatedHtml = generatedHtml;
    document.updatedAt = new Date();
    await document.save();

    sendLeometricResponse(res, {
      message: "Annotations saved and HTML generated.",
      data: {
        success: true,
        docId: document._id,
        annotationCount: cleanedAnnotations.length,
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
      .select("_id filename createdAt updatedAt generatedHtml annotations");

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
