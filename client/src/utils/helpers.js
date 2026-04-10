export const formatBytes = (bytes = 0) => {
  if (!bytes) {
    return "0 B";
  }

  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    sizes.length - 1
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${sizes[index]}`;
};

export const formatDateTime = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
};

export const classNames = (...values) => values.filter(Boolean).join(" ");

export const getProgressFromSteps = (steps = []) => {
  if (!steps.length) {
    return 0;
  }

  const completed = steps.filter((step) => step.status === "success").length;
  return Math.round((completed / steps.length) * 100);
};

export const saveLatestJobId = (jobId) => {
  window.localStorage.setItem("pdf-tagging-latest-job", jobId);
};

export const getLatestJobId = () =>
  window.localStorage.getItem("pdf-tagging-latest-job");

export const downloadJson = (filename, data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const downloadFromUrl = (url) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  anchor.click();
};
