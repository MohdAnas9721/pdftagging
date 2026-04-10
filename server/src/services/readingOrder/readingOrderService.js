const generateReadingOrder = (analysisOutput) => {
  const pages = analysisOutput.pages.map((page) => {
    const orderedBlocks = [...page.blocks]
      .sort((a, b) => a.top - b.top || a.left - b.left)
      .map((block, index) => ({
        order: index + 1,
        blockId: block.id,
        role: block.role,
        text: block.text,
        top: block.top,
        left: block.left,
      }));

    const warnings = [];

    orderedBlocks.forEach((block, index) => {
      const previous = orderedBlocks[index - 1];

      if (
        previous &&
        Math.abs(block.top - previous.top) < 10 &&
        block.left + 180 < previous.left
      ) {
        warnings.push({
          type: "reading-order",
          message: `Page ${page.pageIndex} may have column crossover near order ${index + 1}.`,
          blockId: block.blockId,
        });
      }
    });

    return {
      pageIndex: page.pageIndex,
      blocks: orderedBlocks,
      warnings,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    pages,
    summary: {
      suspiciousPages: pages.filter((page) => page.warnings.length > 0).length,
      totalWarnings: pages.reduce((sum, page) => sum + page.warnings.length, 0),
    },
  };
};

module.exports = {
  generateReadingOrder,
};
