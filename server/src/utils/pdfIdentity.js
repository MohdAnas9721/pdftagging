const fs = require("fs/promises");
const crypto = require("crypto");
const { normalizePdfFilename } = require("./filenameUtils");

const buildPdfFingerprint = ({ filename, fileSize, pageCount }) =>
  `${normalizePdfFilename(filename).toLowerCase()}::${Number(fileSize) || 0}::${Number(
    pageCount
  ) || 0}`;

const computeFileHash = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
};

const buildPdfIdentity = ({
  filename,
  fileSize,
  pageCount,
  fileHash = "",
}) => ({
  fileHash: String(fileHash || ""),
  pdfFingerprint: buildPdfFingerprint({
    filename,
    fileSize,
    pageCount,
  }),
  normalizedFilename: normalizePdfFilename(filename),
  fileSize: Number(fileSize) || 0,
  pageCount: Number(pageCount) || 0,
});

module.exports = {
  buildPdfFingerprint,
  buildPdfIdentity,
  computeFileHash,
};
