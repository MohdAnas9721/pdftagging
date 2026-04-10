const buildAltTextFromContext = (pageBlocks, figureOrder) => {
  const heading = pageBlocks.find((block) => block.role === "heading")?.text;
  const paragraph = pageBlocks.find((block) => block.role === "paragraph")?.text;

  if (heading) {
    return `Illustration related to "${heading}".`;
  }

  if (paragraph) {
    return `Image ${figureOrder} on page context: ${paragraph.slice(0, 80)}${
      paragraph.length > 80 ? "..." : ""
    }`;
  }

  return `Descriptive alt text required for image ${figureOrder}.`;
};

const generateAltTextEntries = (analysisOutput) => {
  const figures = [];

  analysisOutput.pages.forEach((page) => {
    let figureIndex = 0;

    page.blocks.forEach((block) => {
      if (block.role !== "figure") {
        return;
      }

      figureIndex += 1;

      figures.push({
        id: `figure-${page.pageIndex}-${figureIndex}`,
        pageIndex: page.pageIndex,
        sourceBlockId: block.sourceBlockId,
        label: `Figure ${figureIndex}`,
        decorative: false,
        altText: buildAltTextFromContext(page.blocks, figureIndex),
        status: "auto-generated",
      });
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    figures,
    summary: {
      figureCount: figures.length,
      decorativeCount: figures.filter((figure) => figure.decorative).length,
    },
  };
};

const applyAltTextUpdates = (altTextOutput, updates) => {
  const figures = altTextOutput.figures.map((figure) => {
    const incoming = updates.find((item) => item.id === figure.id);

    if (!incoming) {
      return figure;
    }

    return {
      ...figure,
      altText:
        typeof incoming.altText === "string" ? incoming.altText : figure.altText,
      decorative:
        typeof incoming.decorative === "boolean"
          ? incoming.decorative
          : figure.decorative,
      status: "manually-updated",
    };
  });

  return {
    ...altTextOutput,
    updatedAt: new Date().toISOString(),
    figures,
    summary: {
      figureCount: figures.length,
      decorativeCount: figures.filter((figure) => figure.decorative).length,
    },
  };
};

module.exports = {
  generateAltTextEntries,
  applyAltTextUpdates,
};
