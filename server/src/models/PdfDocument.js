const mongoose = require("mongoose");

const annotationSchema = new mongoose.Schema(
  {
    annotationId: {
      type: String,
      default: "",
      trim: true,
    },
    start: {
      type: Number,
      required: true,
      min: 0,
    },
    end: {
      type: Number,
      required: true,
      min: 0,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    tag: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    selectedTag: {
      type: String,
      default: "",
      trim: true,
    },
    textContent: {
      type: String,
      default: "",
      trim: true,
    },
    page: {
      type: Number,
      min: 1,
      default: 1,
    },
    startOffset: {
      type: Number,
      min: 0,
      default: 0,
    },
    endOffset: {
      type: Number,
      min: 0,
      default: 0,
    },
    pageStartOffset: {
      type: Number,
      min: 0,
      default: 0,
    },
    pageEndOffset: {
      type: Number,
      min: 0,
      default: 0,
    },
    fileHash: {
      type: String,
      default: "",
      trim: true,
    },
    pdfFingerprint: {
      type: String,
      default: "",
      trim: true,
    },
    jobId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const pdfDocumentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
      trim: true,
    },
    linkedJobId: {
      type: String,
      default: "",
      trim: true,
    },
    fileHash: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    pdfFingerprint: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    normalizedFilename: {
      type: String,
      default: "",
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
      min: 0,
    },
    pageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rawText: {
      type: String,
      required: true,
    },
    pageTexts: {
      type: [String],
      default: [],
    },
    annotations: {
      type: [annotationSchema],
      default: [],
    },
    generatedHtml: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.PdfDocument ||
  mongoose.model("PdfDocument", pdfDocumentSchema);
