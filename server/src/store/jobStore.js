const path = require("path");
const { PIPELINE_STEPS, STATUS, JOB_STATE } = require("../config/constants");
const { normalizePdfFilename } = require("../utils/filenameUtils");

const jobs = new Map();

const createInitialSteps = () =>
  PIPELINE_STEPS.map((step) => ({
    key: step.key,
    label: step.label,
    status: STATUS.PENDING,
    startedAt: null,
    completedAt: null,
    error: null,
    message: "Waiting to run",
  }));

const createJob = ({ id, file, uploadPath, workspacePath }) => {
  const job = {
    id,
    state: JOB_STATE.UPLOADED,
    currentStep: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    file: {
      originalName: normalizePdfFilename(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
      storedName: path.basename(uploadPath),
      path: uploadPath,
    },
    workspacePath,
    steps: createInitialSteps(),
    logs: [
      {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "PDF uploaded and ready for processing.",
      },
    ],
    outputs: {
      parsed: null,
      analysis: null,
      tags: null,
      readingOrder: null,
      altText: null,
      validation: null,
      taggedPdf: null,
      report: null,
      outputStatus: null,
    },
  };

  jobs.set(id, job);
  return job;
};

const getJob = (id) => jobs.get(id);

const setJobState = (id, patch) =>
  updateJob(id, (job) => ({
    ...job,
    ...patch,
  }));

const updateJob = (id, updater) => {
  const current = jobs.get(id);

  if (!current) {
    return null;
  }

  const nextJob =
    typeof updater === "function" ? updater(structuredClone(current)) : updater;

  nextJob.updatedAt = new Date().toISOString();
  jobs.set(id, nextJob);
  return nextJob;
};

const resetJobProcessingState = (job) => ({
  ...job,
  state: JOB_STATE.UPLOADED,
  currentStep: null,
  steps: createInitialSteps(),
  logs: [
    ...job.logs,
    {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Processing state reset for re-run.",
    },
  ],
  outputs: {
    parsed: null,
    analysis: null,
    tags: null,
    readingOrder: null,
    altText: null,
    validation: null,
    taggedPdf: null,
    report: null,
    outputStatus: null,
  },
});

module.exports = {
  createJob,
  getJob,
  setJobState,
  updateJob,
  resetJobProcessingState,
};
