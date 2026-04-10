const path = require("path");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");
const { sendSuccess, AppError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { ensureDir } = require("../utils/fileUtils");
const { createJob, getJob } = require("../store/jobStore");
const {
  buildArtifactFilename,
  normalizePdfFilename,
} = require("../utils/filenameUtils");
const {
  processJob,
  updateAltTextForJob,
} = require("../services/pipeline/pipelineService");

const sendJsonDownload = (res, filename, payload) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(JSON.stringify(payload, null, 2));
};

const sendPdfDownload = (res, filename, filePath) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.sendFile(path.resolve(filePath));
};

const buildDownloadUrls = (id) => ({
  taggedPdf: `/api/pdf/result/${id}?download=tagged-pdf`,
  parsedJson: `/api/pdf/result/${id}?download=parsed`,
  semanticAnalysisJson: `/api/pdf/result/${id}?download=analysis`,
  tagTreeJson: `/api/pdf/result/${id}?download=tags`,
  readingOrderJson: `/api/pdf/result/${id}?download=reading-order`,
  altTextJson: `/api/pdf/result/${id}?download=alt-text`,
  validationReportJson: `/api/pdf/result/${id}?download=validation`,
  summaryReportText: `/api/pdf/report/${id}?download=summary`,
  summaryReportJson: `/api/pdf/report/${id}?download=summary-json`,
});

const serializeJob = (job) => {
  if (!job) {
    return null;
  }

  return {
    id: job.id,
    state: job.state,
    currentStep: job.currentStep,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    file: {
      originalName: normalizePdfFilename(job.file.originalName),
      size: job.file.size,
      mimeType: job.file.mimeType,
    },
    steps: job.steps,
    logs: job.logs,
    outputs: job.outputs,
    downloadUrls: buildDownloadUrls(job.id),
  };
};

const uploadPdf = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("PDF file is required.", 400);
  }

  const jobId = uuidv4();
  const workspacePath = path.join(env.tempDir, jobId);
  await ensureDir(workspacePath);

  const job = createJob({
    id: jobId,
    file: req.file,
    uploadPath: req.file.path,
    workspacePath,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: "PDF uploaded successfully.",
    data: {
      job: serializeJob(job),
    },
  });
});

const startProcessing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = getJob(id);

  if (!job) {
    throw new AppError("Job not found.", 404);
  }

  if (job.state === "processing") {
    throw new AppError("This PDF is already processing.", 409);
  }

  processJob(id).catch(() => {});

  sendSuccess(res, {
    statusCode: 202,
    message: "PDF processing started.",
    data: {
      job: serializeJob(getJob(id)),
    },
  });
});

const getStatus = asyncHandler(async (req, res) => {
  const job = getJob(req.params.id);

  if (!job) {
    throw new AppError("Job not found.", 404);
  }

  sendSuccess(res, {
    message: "Job status fetched.",
    data: {
      job: serializeJob(job),
    },
  });
});

const getResult = asyncHandler(async (req, res) => {
  const job = getJob(req.params.id);

  if (!job) {
    throw new AppError("Job not found.", 404);
  }

  const requestedDownload = req.query.download;

  if (
    requestedDownload &&
    (
      (requestedDownload === "parsed" && !job.outputs.parsed) ||
      (requestedDownload === "analysis" && !job.outputs.analysis) ||
      (requestedDownload === "tagged-pdf" && !job.outputs.taggedPdf) ||
      (requestedDownload === "tags" && !job.outputs.tags) ||
      (requestedDownload === "reading-order" && !job.outputs.readingOrder) ||
      (requestedDownload === "alt-text" && !job.outputs.altText) ||
      (requestedDownload === "validation" && !job.outputs.validation)
    )
  ) {
    throw new AppError("Processed result artifacts are not ready yet.", 400);
  }

  if (requestedDownload === "parsed") {
    sendJsonDownload(
      res,
      buildArtifactFilename(job.file.originalName, "parsed-output"),
      job.outputs.parsed || {}
    );
    return;
  }

  if (requestedDownload === "analysis") {
    sendJsonDownload(
      res,
      buildArtifactFilename(job.file.originalName, "semantic-analysis"),
      job.outputs.analysis || {}
    );
    return;
  }

  if (requestedDownload === "tagged-pdf") {
    sendPdfDownload(
      res,
      job.outputs.taggedPdf.fileName,
      job.outputs.taggedPdf.path
    );
    return;
  }

  if (requestedDownload === "tags") {
    sendJsonDownload(
      res,
      buildArtifactFilename(job.file.originalName, "tag-tree"),
      job.outputs.tags || {}
    );
    return;
  }

  if (requestedDownload === "reading-order") {
    sendJsonDownload(
      res,
      buildArtifactFilename(job.file.originalName, "reading-order"),
      job.outputs.readingOrder || {}
    );
    return;
  }

  if (requestedDownload === "alt-text") {
    sendJsonDownload(
      res,
      buildArtifactFilename(job.file.originalName, "alt-text"),
      job.outputs.altText || {}
    );
    return;
  }

  if (requestedDownload === "validation") {
    sendJsonDownload(
      res,
      buildArtifactFilename(job.file.originalName, "validation-report"),
      job.outputs.validation || {}
    );
    return;
  }

  sendSuccess(res, {
    message: "Job result fetched.",
    data: {
      job: serializeJob(job),
      deliverables: {
        taggedPdf: job.outputs.taggedPdf,
        parsedJson: job.outputs.parsed,
        semanticAnalysisJson: job.outputs.analysis,
        tagTreeJson: job.outputs.tags,
        readingOrderJson: job.outputs.readingOrder,
        altTextJson: job.outputs.altText,
        validationReportJson: job.outputs.validation,
        summaryReport: job.outputs.report,
      },
      downloadUrls: buildDownloadUrls(req.params.id),
    },
  });
});

const reprocessPdf = asyncHandler(async (req, res) => {
  const job = getJob(req.params.id);

  if (!job) {
    throw new AppError("Job not found.", 404);
  }

  if (job.state === "processing") {
    throw new AppError("This PDF is already processing.", 409);
  }

  processJob(req.params.id, { reset: true }).catch(() => {});

  sendSuccess(res, {
    statusCode: 202,
    message: "PDF re-processing started.",
    data: {
      job: serializeJob(getJob(req.params.id)),
    },
  });
});

const updateAltText = asyncHandler(async (req, res) => {
  const updates = Array.isArray(req.body?.updates)
    ? req.body.updates
    : [
        {
          id: req.body?.id,
          altText: req.body?.altText,
          decorative: req.body?.decorative,
        },
      ];

  const sanitizedUpdates = updates.filter((item) => item && item.id);

  if (!sanitizedUpdates.length) {
    throw new AppError("At least one alt text update is required.", 400);
  }

  const job = await updateAltTextForJob(req.params.id, sanitizedUpdates);

  sendSuccess(res, {
    message: "Alt text updated and validation refreshed.",
    data: {
      job: serializeJob(job),
    },
  });
});

const getReport = asyncHandler(async (req, res) => {
  const job = getJob(req.params.id);

  if (!job) {
    throw new AppError("Job not found.", 404);
  }

  if (!job.outputs.report) {
    throw new AppError("Summary report is not ready yet.", 400);
  }

  if (req.query.download === "summary") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${buildArtifactFilename(
        job.file.originalName,
        "summary-report",
        "txt"
      )}"`
    );
    res.send(job.outputs.report.summaryText);
    return;
  }

  if (req.query.download === "summary-json") {
    sendJsonDownload(
      res,
      buildArtifactFilename(job.file.originalName, "summary-report"),
      job.outputs.report
    );
    return;
  }

  sendSuccess(res, {
    message: "Validation report fetched.",
    data: {
      report: job.outputs.report,
      validation: job.outputs.validation,
    },
  });
});

module.exports = {
  uploadPdf,
  startProcessing,
  getStatus,
  getResult,
  reprocessPdf,
  updateAltText,
  getReport,
};
