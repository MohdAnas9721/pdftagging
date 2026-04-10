const path = require("path");

const normalizePdfFilename = (inputName = "document.pdf") => {
  const basename = path.basename(String(inputName || "").trim()) || "document.pdf";
  let stem = basename;

  while (stem.toLowerCase().endsWith(".pdf")) {
    stem = stem.slice(0, -4);
  }

  stem = stem
    .replace(/\.pdf(\s*\(\d+\))/gi, "$1")
    .replace(/(\s*\(\d+\))(?:\s*\1)+$/i, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!stem) {
    stem = "document";
  }

  return `${stem}.pdf`;
};

const buildArtifactFilename = (originalName, artifactSuffix, extension = "json") => {
  const normalizedPdfName = normalizePdfFilename(originalName);
  const stem = normalizedPdfName.slice(0, -4);
  return `${stem}-${artifactSuffix}.${extension}`;
};

module.exports = {
  normalizePdfFilename,
  buildArtifactFilename,
};
