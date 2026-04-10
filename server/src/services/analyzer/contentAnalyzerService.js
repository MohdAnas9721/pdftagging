const getHeadingLevel = (fontSize, baselineSize) => {
  if (fontSize >= baselineSize * 2.2) {
    return 1;
  }

  if (fontSize >= baselineSize * 1.8) {
    return 2;
  }

  if (fontSize >= baselineSize * 1.55) {
    return 3;
  }

  if (fontSize >= baselineSize * 1.4) {
    return 4;
  }

  if (fontSize >= baselineSize * 1.3) {
    return 5;
  }

  return 6;
};

const isListItem = (text) =>
  /^((\d+[\.\)])|([a-zA-Z][\.\)])|[-*])\s+/.test(text.trim());

const isLikelyTableRow = (text) => {
  const hasPipe = text.includes("|");
  const hasTab = /\t/.test(text);
  const denseSpacing =
    /\s{3,}/.test(text) && text.trim().split(/\s{3,}/).length > 2;

  return hasPipe || hasTab || denseSpacing;
};

const normalizeTableCells = (text) => {
  if (text.includes("|")) {
    return text
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
  }

  return text
    .split(/\s{3,}|\t+/)
    .map((cell) => cell.trim())
    .filter(Boolean);
};

const analyzeContent = (parsedOutput) => {
  const baselineSize = parsedOutput.document.medianFontSize || 12;
  const pages = parsedOutput.pages.map((page) => {
    const blocks = [];

    page.textBlocks.forEach((block, index) => {
      const trimmedText = block.text.trim();
      const shortText = trimmedText.length <= 140;
      const normalizedBlock = {
        id: `semantic-${page.pageIndex}-${index + 1}`,
        pageIndex: page.pageIndex,
        sourceBlockId: block.id,
        top: block.top,
        left: block.left,
        text: trimmedText,
        fontSize: block.fontSize,
        role: "paragraph",
        details: {},
      };

      if (!trimmedText) {
        normalizedBlock.role = "empty";
      } else if (isLikelyTableRow(trimmedText)) {
        normalizedBlock.role = "table_row";
        normalizedBlock.details.cells = normalizeTableCells(trimmedText);
      } else if (isListItem(trimmedText)) {
        normalizedBlock.role = "list_item";
      } else if (shortText && block.fontSize >= baselineSize * 1.3) {
        normalizedBlock.role = "heading";
        normalizedBlock.details.level = getHeadingLevel(
          block.fontSize,
          baselineSize
        );
      }

      blocks.push(normalizedBlock);
    });

    page.imageBlocks.forEach((image, index) => {
      blocks.push({
        id: `semantic-figure-${page.pageIndex}-${index + 1}`,
        pageIndex: page.pageIndex,
        sourceBlockId: image.id,
        top: image.top,
        left: image.left,
        text: "",
        fontSize: 0,
        role: "figure",
        details: {
          imageIndex: image.imageIndex,
          inferred: image.inferred,
        },
      });
    });

    return {
      pageIndex: page.pageIndex,
      blocks: blocks.sort((a, b) => a.top - b.top || a.left - b.left),
    };
  });

  const allBlocks = pages.flatMap((page) => page.blocks);
  const headings = allBlocks.filter((block) => block.role === "heading");
  const figures = allBlocks.filter((block) => block.role === "figure");
  const listItems = allBlocks.filter((block) => block.role === "list_item");
  const tables = allBlocks.filter((block) => block.role === "table_row");

  return {
    document: {
      pageCount: parsedOutput.document.pageCount,
      baselineFontSize: baselineSize,
      analyzedAt: new Date().toISOString(),
    },
    pages,
    summary: {
      headings: headings.length,
      figures: figures.length,
      listItems: listItems.length,
      tableRows: tables.length,
      paragraphs: allBlocks.filter((block) => block.role === "paragraph").length,
    },
  };
};

module.exports = {
  analyzeContent,
};
