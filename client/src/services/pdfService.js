import { request, API_BASE_URL } from "./api";

export const uploadPdf = async (file) => {
  const formData = new FormData();
  formData.append("pdf", file);

  return request("/pdf/upload", {
    method: "POST",
    body: formData,
  });
};

export const startPdfProcessing = (jobId) =>
  request(`/pdf/process/${jobId}`, {
    method: "POST",
  });

export const getPdfStatus = (jobId) => request(`/pdf/status/${jobId}`);

export const getPdfResult = (jobId) => request(`/pdf/result/${jobId}`);

export const getArtifactDownloadUrl = (jobId, type) =>
  `${API_BASE_URL}/pdf/result/${jobId}?download=${type}`;

export const reprocessPdf = (jobId) =>
  request(`/pdf/reprocess/${jobId}`, {
    method: "POST",
  });

export const updateAltText = (jobId, updates) =>
  request(`/pdf/alt-text/${jobId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ updates }),
  });

export const getReportDownloadUrl = (jobId) =>
  `${API_BASE_URL}/pdf/report/${jobId}?download=summary`;
