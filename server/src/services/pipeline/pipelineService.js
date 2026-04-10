const path = require("path");
const fs = require("fs/promises");
const { PIPELINE_STEPS, STATUS, JOB_STATE } = require("../../config/constants");
const { parsePdf } = require("../pdf/pdfParserService");
const { analyzeContent } = require("../analyzer/contentAnalyzerService");
const { generateTagTree } = require("../tagging/tagGeneratorService");
const { generateReadingOrder } = require("../readingOrder/readingOrderService");
const {
  generateAltTextEntries,
  applyAltTextUpdates,
} = require("../altText/altTextService");
const {
  validateAccessibility,
} = require("../validator/accessibilityValidatorService");
const { generateReportArtifacts } = require("../report/reportService");
const { buildTaggedPdf } = require("../export/taggedPdfBuilderService");
const {
  getJob,
  setJobState: patchJobState,
  updateJob,
  resetJobProcessingState,
} = require("../../store/jobStore");
const { AppError } = require("../../utils/apiResponse");
const { ensureDir, writeJson, writeText } = require("../../utils/fileUtils");

const updateStep = (jobId, stepKey, patch) =>
  updateJob(jobId, (job) => ({
    ...job,
    steps: job.steps.map((step) =>
      step.key === stepKey ? { ...step, ...patch } : step
    ),
  }));

const appendLog = (jobId, message, level = "info") =>
  updateJob(jobId, (job) => ({
    ...job,
    logs: [
      ...job.logs,
      {
        timestamp: new Date().toISOString(),
        level,
        message,
      },
    ],
  }));

const setJobState = (jobId, state, currentStep = null) =>
  patchJobState(jobId, {
    state,
    currentStep,
  });

const persistArtifact = async (job, name, data, extension = "json") => {
  const artifactPath = path.join(job.workspacePath, `${name}.${extension}`);

  if (extension === "json") {
    await writeJson(artifactPath, data);
  } else {
    await writeText(artifactPath, data);
  }

  return artifactPath;
};

const runStep = async (jobId, stepKey, stepHandler) => {
  const stepMeta = PIPELINE_STEPS.find((step) => step.key === stepKey);

  updateStep(jobId, stepKey, {
    status: STATUS.RUNNING,
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
    message: `${stepMeta.label} is running.`,
  });
  setJobState(jobId, JOB_STATE.PROCESSING, stepKey);
  appendLog(jobId, `${stepMeta.label} started.`);

  try {
    const output = await stepHandler();

    updateStep(jobId, stepKey, {
      status: STATUS.SUCCESS,
      completedAt: new Date().toISOString(),
      message: `${stepMeta.label} completed successfully.`,
    });
    appendLog(jobId, `${stepMeta.label} completed.`);
    return output;
  } catch (error) {
    updateStep(jobId, stepKey, {
      status: STATUS.ERROR,
      completedAt: new Date().toISOString(),
      error: error.message,
      message: `${stepMeta.label} failed.`,
    });
    setJobState(jobId, JOB_STATE.ERROR, stepKey);
    appendLog(jobId, `${stepMeta.label} failed: ${error.message}`, "error");
    throw error;
  }
};

const syncOutputStatus = (jobId, key, value) =>
  updateJob(jobId, (job) => ({
    ...job,
    outputs: {
      ...job.outputs,
      [key]: value,
    },
  }));

const syncTagTreeAltText = (tagTreeOutput, altTextOutput) => {
  if (!tagTreeOutput?.root) {
    return tagTreeOutput;
  }

  const figuresBySource = new Map(
    altTextOutput.figures.map((figure) => [figure.sourceBlockId, figure])
  );

  const applyUpdates = (node) => ({
    ...node,
    meta:
      node.type === "Figure" && figuresBySource.has(node.meta?.sourceBlockId)
        ? {
            ...node.meta,
            altText: figuresBySource.get(node.meta.sourceBlockId).altText,
            decorative: figuresBySource.get(node.meta.sourceBlockId).decorative,
          }
        : node.meta,
    children: node.children?.map(applyUpdates) || [],
  });

  return {
    ...tagTreeOutput,
    root: applyUpdates(tagTreeOutput.root),
  };
};

const processJob = async (jobId, { reset = false } = {}) => {
  let job = getJob(jobId);

  if (!job) {
    throw new AppError("Job not found.", 404);
  }

  if (job.state === JOB_STATE.PROCESSING) {
    throw new AppError("This PDF is already processing.", 409);
  }

  if (reset) {
    updateJob(jobId, (currentJob) => resetJobProcessingState(currentJob));
    job = getJob(jobId);
  }

  try {
    setJobState(jobId, JOB_STATE.PROCESSING, "parser");
    appendLog(jobId, "Pipeline accepted and queued for sequential processing.");
    await ensureDir(job.workspacePath);
    await fs.rm(job.workspacePath, { recursive: true, force: true });
    await ensureDir(job.workspacePath);

    const parsedOutput = await runStep(jobId, "parser", async () => {
      const result = await parsePdf(job.file.path);
      await persistArtifact(getJob(jobId), "parsed-output", result);
      syncOutputStatus(jobId, "parsed", result);
      return result;
    });

    const analysisOutput = await runStep(jobId, "analyzer", async () => {
      const result = analyzeContent(parsedOutput);
      await persistArtifact(getJob(jobId), "semantic-analysis", result);
      syncOutputStatus(jobId, "analysis", result);
      return result;
    });

    const tagTreeOutput = await runStep(jobId, "tagger", async () => {
      const result = generateTagTree(analysisOutput);
      await persistArtifact(getJob(jobId), "tag-tree", result);
      syncOutputStatus(jobId, "tags", result);
      return result;
    });

    const readingOrderOutput = await runStep(jobId, "readingOrder", async () => {
      const result = generateReadingOrder(analysisOutput);
      await persistArtifact(getJob(jobId), "reading-order", result);
      syncOutputStatus(jobId, "readingOrder", result);
      return result;
    });

    const altTextOutput = await runStep(jobId, "altText", async () => {
      const result = generateAltTextEntries(analysisOutput);
      await persistArtifact(getJob(jobId), "alt-text", result);
      syncOutputStatus(jobId, "altText", result);
      return result;
    });

    const validationOutput = await runStep(jobId, "validator", async () => {
      const result = validateAccessibility({
        parsedOutput,
        analysisOutput,
        readingOrderOutput,
        altTextOutput,
        tagTreeOutput,
      });
      await persistArtifact(getJob(jobId), "validation-report", result);
      syncOutputStatus(jobId, "validation", result);
      return result;
    });

    const taggedPdfOutput = await buildTaggedPdf({
      job: getJob(jobId),
      analysisOutput,
      tagTreeOutput,
      readingOrderOutput,
    });
    syncOutputStatus(jobId, "taggedPdf", taggedPdfOutput);
    appendLog(jobId, "Tagged PDF export generated from semantic pipeline artifacts.");

    const reportOutput = generateReportArtifacts({
      job: getJob(jobId),
      parsedOutput,
      analysisOutput,
      tagTreeOutput,
      readingOrderOutput,
      altTextOutput,
      validationOutput,
      taggedPdfOutput,
    });

    await persistArtifact(getJob(jobId), "summary-report", reportOutput.summaryText, "txt");
    syncOutputStatus(jobId, "report", reportOutput);
    syncOutputStatus(jobId, "outputStatus", reportOutput.outputStatus);

    setJobState(jobId, JOB_STATE.READY, null);
    appendLog(jobId, "All pipeline steps completed. Result artifacts are ready.");
  } catch (error) {
    setJobState(jobId, JOB_STATE.ERROR, null);
    appendLog(jobId, `Pipeline finalization failed: ${error.message}`, "error");
    throw error;
  }

  return getJob(jobId);
};

const rerunValidationArtifacts = async (jobId) => {
  const job = getJob(jobId);

  if (!job) {
    throw new AppError("Job not found.", 404);
  }

  const validationOutput = validateAccessibility({
    parsedOutput: job.outputs.parsed,
    analysisOutput: job.outputs.analysis,
    readingOrderOutput: job.outputs.readingOrder,
    altTextOutput: job.outputs.altText,
    tagTreeOutput: job.outputs.tags,
  });

  await persistArtifact(job, "validation-report", validationOutput);
  syncOutputStatus(jobId, "validation", validationOutput);

  let taggedPdfOutput = job.outputs.taggedPdf;

  if (job.outputs.tags && job.outputs.readingOrder && job.outputs.analysis) {
    taggedPdfOutput = await buildTaggedPdf({
      job: getJob(jobId),
      analysisOutput: job.outputs.analysis,
      tagTreeOutput: job.outputs.tags,
      readingOrderOutput: job.outputs.readingOrder,
    });
    syncOutputStatus(jobId, "taggedPdf", taggedPdfOutput);
    appendLog(jobId, "Tagged PDF export regenerated after content updates.");
  }

  const reportOutput = generateReportArtifacts({
    job: getJob(jobId),
    parsedOutput: job.outputs.parsed,
    analysisOutput: job.outputs.analysis,
    tagTreeOutput: job.outputs.tags,
    readingOrderOutput: job.outputs.readingOrder,
    altTextOutput: job.outputs.altText,
    validationOutput,
    taggedPdfOutput,
  });

  await persistArtifact(job, "summary-report", reportOutput.summaryText, "txt");
  syncOutputStatus(jobId, "report", reportOutput);
  syncOutputStatus(jobId, "outputStatus", reportOutput.outputStatus);
  appendLog(jobId, "Alt text updates applied and validation re-ran.");

  return getJob(jobId);
};

const updateAltTextForJob = async (jobId, updates) => {
  const job = getJob(jobId);

  if (!job) {
    throw new AppError("Job not found.", 404);
  }

  if (!job.outputs.altText) {
    throw new AppError("Alt text data is not available yet for this job.", 400);
  }

  const nextAltText = applyAltTextUpdates(job.outputs.altText, updates);
  await persistArtifact(job, "alt-text", nextAltText);
  syncOutputStatus(jobId, "altText", nextAltText);

  if (job.outputs.tags) {
    const nextTagTree = syncTagTreeAltText(job.outputs.tags, nextAltText);
    await persistArtifact(job, "tag-tree", nextTagTree);
    syncOutputStatus(jobId, "tags", nextTagTree);
  }

  return rerunValidationArtifacts(jobId);
};

module.exports = {
  processJob,
  updateAltTextForJob,
};
