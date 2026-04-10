const severityRank = {
  error: 3,
  warning: 2,
  pass: 1,
};

const createCheck = (id, severity, title, message, meta = {}) => ({
  id,
  severity,
  title,
  message,
  meta,
});

const validateAccessibility = ({
  parsedOutput,
  analysisOutput,
  readingOrderOutput,
  altTextOutput,
  tagTreeOutput,
}) => {
  const checks = [];
  const headings = analysisOutput.pages.flatMap((page) =>
    page.blocks.filter((block) => block.role === "heading")
  );

  headings.forEach((heading, index) => {
    const previous = headings[index - 1];
    const currentLevel = heading.details.level || 1;
    const previousLevel = previous?.details.level || 1;

    if (previous && currentLevel - previousLevel > 1) {
      checks.push(
        createCheck(
          `heading-seq-${index + 1}`,
          "warning",
          "Heading sequence jump",
          `Heading "${heading.text}" jumps from H${previousLevel} to H${currentLevel}.`,
          { pageIndex: heading.pageIndex }
        )
      );
    }
  });

  altTextOutput.figures.forEach((figure) => {
    if (!figure.decorative && !figure.altText.trim()) {
      checks.push(
        createCheck(
          `alt-${figure.id}`,
          "error",
          "Missing alt text",
          `Figure on page ${figure.pageIndex} requires alt text or decorative marking.`,
          { figureId: figure.id, pageIndex: figure.pageIndex }
        )
      );
    } else {
      checks.push(
        createCheck(
          `alt-pass-${figure.id}`,
          "pass",
          "Alt text available",
          `Figure on page ${figure.pageIndex} has an accessibility description.`,
          { figureId: figure.id, pageIndex: figure.pageIndex }
        )
      );
    }
  });

  analysisOutput.pages.forEach((page) => {
    page.blocks
      .filter((block) => block.role === "paragraph")
      .forEach((block) => {
        if (block.text.trim().length < 2) {
          checks.push(
            createCheck(
              `empty-p-${block.id}`,
              "warning",
              "Empty paragraph",
              `Page ${page.pageIndex} contains a paragraph block with almost no text.`,
              { blockId: block.id, pageIndex: page.pageIndex }
            )
          );
        }
      });
  });

  readingOrderOutput.pages.forEach((page) => {
    page.warnings.forEach((warning, index) => {
      checks.push(
        createCheck(
          `reading-${page.pageIndex}-${index + 1}`,
          "warning",
          "Suspicious reading order",
          warning.message,
          { pageIndex: page.pageIndex, blockId: warning.blockId }
        )
      );
    });
  });

  const unsupportedBlocks = analysisOutput.pages.flatMap((page) =>
    page.blocks.filter(
      (block) =>
        !["heading", "paragraph", "list_item", "table_row", "figure"].includes(
          block.role
        )
    )
  );

  unsupportedBlocks.forEach((block, index) => {
    checks.push(
      createCheck(
        `unsupported-${index + 1}`,
        "warning",
        "Unsupported block type",
        `Block ${block.id} on page ${block.pageIndex} was not mapped to a formal tag type.`,
        { blockId: block.id, pageIndex: block.pageIndex }
      )
    );
  });

  const tableNodes = [];
  const walkNodes = (node) => {
    if (node.type === "Table") {
      tableNodes.push(node);
    }

    node.children.forEach(walkNodes);
  };
  walkNodes(tagTreeOutput.root);

  tableNodes.forEach((tableNode, index) => {
    if (tableNode.children.length < 2) {
      checks.push(
        createCheck(
          `table-${index + 1}`,
          "warning",
          "Table structure needs review",
          `A detected table on page ${tableNode.meta.pageIndex} has less than 2 rows.`,
          { pageIndex: tableNode.meta.pageIndex, tableId: tableNode.id }
        )
      );
    }
  });

  if (!checks.length) {
    checks.push(
      createCheck(
        "baseline-pass",
        "pass",
        "No issues detected",
        "Baseline accessibility checks completed without warnings.",
        {}
      )
    );
  }

  const sortedChecks = checks.sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity]
  );

  return {
    generatedAt: new Date().toISOString(),
    checks: sortedChecks,
    summary: {
      errors: sortedChecks.filter((check) => check.severity === "error").length,
      warnings: sortedChecks.filter((check) => check.severity === "warning")
        .length,
      passes: sortedChecks.filter((check) => check.severity === "pass").length,
      pages: parsedOutput.document.pageCount,
    },
  };
};

module.exports = {
  validateAccessibility,
};
