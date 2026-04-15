const { normalizePdfFilename } = require("../../utils/filenameUtils");

const generateReportArtifacts = ({
  job,
  parsedOutput,
  analysisOutput,
  tagTreeOutput,
  readingOrderOutput,
  altTextOutput,
  validationOutput,
  taggedPdfOutput,
}) => {
  const prototypeMessage =
    "Prototype output generated. Structured tagging artifacts ready. Final embedded PDF tag write-back is not yet implemented.";
  const uniqueTagCount =
    parsedOutput.extractedTags?.summary?.dedupedCount ??
    tagTreeOutput.summary?.uniqueExtractedTagCount ??
    tagTreeOutput.summary?.nodeCount ??
    0;

  const summaryLines = [
    "PDF Tagging Workflow Summary",
    "",
    `Job ID: ${job.id}`,
    `File: ${normalizePdfFilename(job.file.originalName)}`,
    `Pages: ${parsedOutput.document.pageCount}`,
    `Detected figures: ${altTextOutput.summary.figureCount}`,
    `Detected headings: ${analysisOutput.summary.headings}`,
    `Validation errors: ${validationOutput.summary.errors}`,
    `Validation warnings: ${validationOutput.summary.warnings}`,
    `Tagged PDF export: ${taggedPdfOutput ? "available" : "not generated"}`,
    "",
    "Pipeline deliverables",
    "- Parsed JSON: available",
    "- Semantic analysis JSON: available",
    "- Tag tree JSON: available",
    "- Reading order JSON: available",
    "- Alt text JSON: available",
    "- Validation report JSON: available",
    `- Tagged PDF export: ${taggedPdfOutput?.fileName || "not generated"}`,
    "",
    "Prototype output status",
    prototypeMessage,
  ];

  return {
    generatedAt: new Date().toISOString(),
    summaryText: summaryLines.join("\n"),
    outputStatus: {
      type: taggedPdfOutput ? "tagged-pdf-output" : "prototype-output",
      status: taggedPdfOutput ? "tagged-pdf-ready" : "pending-tagged-pdf-build",
      message: taggedPdfOutput ? taggedPdfOutput.message : prototypeMessage,
    },
    stats: {
      pages: parsedOutput.document.pageCount,
      semanticBlocks: analysisOutput.pages.reduce(
        (sum, page) => sum + page.blocks.length,
        0
      ),
      tagNodes: uniqueTagCount,
      readingOrderWarnings: readingOrderOutput.summary.totalWarnings,
      validationErrors: validationOutput.summary.errors,
      validationWarnings: validationOutput.summary.warnings,
      validationPasses: validationOutput.summary.passes,
      taggedPdfSize: taggedPdfOutput?.size || 0,
    },
  };
};

module.exports = {
  generateReportArtifacts,
};
