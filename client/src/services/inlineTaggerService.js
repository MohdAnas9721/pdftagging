import { request } from "./api";

export const uploadInlinePdf = async (file) => {
  const formData = new FormData();
  formData.append("pdf", file);

  return request("/upload", {
    method: "POST",
    body: formData,
  });
};

export const saveInlineTags = (docId, annotations) =>
  request("/save-tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      docId,
      annotations,
    }),
  });
