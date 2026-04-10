const fs = require("fs/promises");

let pdfjsLibPromise;

const getPdfJs = async () => {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }

  return pdfjsLibPromise;
};

const median = (values) => {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

const groupTextItemsIntoBlocks = (textItems) => {
  const rows = [];

  textItems.forEach((item) => {
    const existingRow = rows.find((row) => Math.abs(row.top - item.top) < 8);

    if (existingRow) {
      existingRow.items.push(item);
      existingRow.left = Math.min(existingRow.left, item.left);
      existingRow.right = Math.max(existingRow.right, item.left + item.width);
      existingRow.height = Math.max(existingRow.height, item.height);
      existingRow.top = (existingRow.top + item.top) / 2;
      return;
    }

    rows.push({
      top: item.top,
      left: item.left,
      right: item.left + item.width,
      height: item.height,
      items: [item],
    });
  });

  return rows
    .sort((a, b) => a.top - b.top || a.left - b.left)
    .map((row, index) => {
      const sortedItems = row.items.sort((a, b) => a.left - b.left);
      const text = sortedItems
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const fontSizes = sortedItems.map((item) => item.fontSize).filter(Boolean);

      return {
        id: `text-block-${index + 1}`,
        type: "text",
        text,
        top: Number(row.top.toFixed(2)),
        left: Number(row.left.toFixed(2)),
        width: Number((row.right - row.left).toFixed(2)),
        height: Number(row.height.toFixed(2)),
        fontSize: Number(median(fontSizes).toFixed(2)),
        fontNames: [
          ...new Set(sortedItems.map((item) => item.fontName).filter(Boolean)),
        ],
        itemCount: sortedItems.length,
        items: sortedItems,
      };
    })
    .filter((block) => block.text.length > 0);
};

const detectImagesForPage = (operatorList, pageIndex, pageHeight, pdfjsLib) => {
  const imageOps = [
    pdfjsLib.OPS.paintImageXObject,
    pdfjsLib.OPS.paintInlineImageXObject,
    pdfjsLib.OPS.paintJpegXObject,
  ];

  const imageCount = operatorList.fnArray.filter((fn) =>
    imageOps.includes(fn)
  ).length;

  return Array.from({ length: imageCount }).map((_, index) => ({
    id: `image-${pageIndex + 1}-${index + 1}`,
    type: "image",
    pageIndex: pageIndex + 1,
    imageIndex: index + 1,
    top: Number(((index + 1) * (pageHeight / (imageCount + 1))).toFixed(2)),
    left: 72,
    width: 240,
    height: 160,
    inferred: true,
    source: "pdf-operator-list",
  }));
};

const parsePdf = async (filePath) => {
  const pdfjsLib = await getPdfJs();
  const data = new Uint8Array(await fs.readFile(filePath));
  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const pdfDocument = await loadingTask.promise;
  const pages = [];
  const allFontSizes = [];
  let totalImages = 0;

  for (let pageIndex = 0; pageIndex < pdfDocument.numPages; pageIndex += 1) {
    const page = await pdfDocument.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const operatorList = await page.getOperatorList();

    const textItems = textContent.items
      .map((item, itemIndex) => {
        const height = Math.abs(item.transform[3]) || 0;
        const fontSize = Number(height.toFixed(2));
        const top = viewport.height - item.transform[5];
        const block = {
          id: `text-item-${pageIndex + 1}-${itemIndex + 1}`,
          text: String(item.str || "").trim(),
          left: Number(item.transform[4].toFixed(2)),
          top: Number(top.toFixed(2)),
          width: Number((item.width || 0).toFixed(2)),
          height: Number(height.toFixed(2)),
          fontName: item.fontName || "unknown",
          fontSize,
        };

        if (fontSize) {
          allFontSizes.push(fontSize);
        }

        return block;
      })
      .filter((item) => item.text.length > 0);

    const textBlocks = groupTextItemsIntoBlocks(textItems);
    const imageBlocks = detectImagesForPage(
      operatorList,
      pageIndex,
      viewport.height,
      pdfjsLib
    );

    totalImages += imageBlocks.length;

    pages.push({
      pageIndex: pageIndex + 1,
      width: Number(viewport.width.toFixed(2)),
      height: Number(viewport.height.toFixed(2)),
      rotation: viewport.rotation,
      textBlocks,
      imageBlocks,
      metadata: {
        textBlockCount: textBlocks.length,
        imageBlockCount: imageBlocks.length,
        textLength: textBlocks.reduce((sum, block) => sum + block.text.length, 0),
      },
    });
  }

  return {
    document: {
      pageCount: pdfDocument.numPages,
      totalImages,
      extractedAt: new Date().toISOString(),
      medianFontSize: Number(median(allFontSizes).toFixed(2)),
    },
    pages,
  };
};

module.exports = {
  parsePdf,
};
