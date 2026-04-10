const PIPELINE_STEPS = [
  { key: "parser", label: "PDF Parser" },
  { key: "analyzer", label: "Content Analyzer" },
  { key: "tagger", label: "Tag Generator" },
  { key: "readingOrder", label: "Reading Order Engine" },
  { key: "altText", label: "Alt Text Generator" },
  { key: "validator", label: "Accessibility Validator" },
];

const STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  ERROR: "error",
};

const JOB_STATE = {
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  READY: "ready",
  ERROR: "error",
};

module.exports = {
  PIPELINE_STEPS,
  STATUS,
  JOB_STATE,
};
