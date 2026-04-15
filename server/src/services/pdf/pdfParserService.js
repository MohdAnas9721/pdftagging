const fs = require("fs/promises");
const { createCanvas } = require("@napi-rs/canvas");
const Tesseract = require("tesseract.js");
const {
  buildExtractedTagsDataset,
  createEmptyExtractedTags,
} = require("../tagging/extractedTagNormalizerService");

let pdfjsLibPromise;
let ocrWorkerPromise;

const getPdfJs = async () => {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }

  return pdfjsLibPromise;
};

const getOcrWorker = async () => {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const worker = await Tesseract.createWorker("eng", 1, {
        logger: () => {},
      });
      await worker.setParameters({
        preserve_interword_spaces: "1",
      });
      return worker;
    })();
  }

  return ocrWorkerPromise;
};

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .replace(/\s([,.;:!?])/g, "$1")
    .trim();

const truncateText = (value, maxLength = 180) => {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
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

const getFontMetadataResolver = (page) => {
  const cache = new Map();

  return (fontName) => {
    if (!fontName) {
      return {
        bold: false,
        italic: false,
        loadedName: "unknown",
        baseName: "unknown",
      };
    }

    if (cache.has(fontName)) {
      return cache.get(fontName);
    }

    let metadata;

    try {
      const font = page.commonObjs.get(fontName);
      metadata = {
        bold: Boolean(font?.bold),
        italic: Boolean(font?.italic),
        loadedName: font?.loadedName || fontName,
        baseName: font?.name || fontName,
      };
    } catch {
      metadata = {
        bold: false,
        italic: false,
        loadedName: fontName,
        baseName: fontName,
      };
    }

    cache.set(fontName, metadata);
    return metadata;
  };
};

const mergeMetrics = (current, next) => {
  if (!next) {
    return current;
  }

  if (!current) {
    return { ...next };
  }

  return {
    left: Math.min(current.left, next.left),
    top: Math.min(current.top, next.top),
    fontSize: Math.max(current.fontSize || 0, next.fontSize || 0),
  };
};

const buildTagNode = (id, type, label, meta = {}, children = []) => ({
  id,
  type,
  label,
  meta,
  children,
});

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
      const text = normalizeWhitespace(
        sortedItems.map((item) => item.text).join(" ")
      );
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

const normalizeAnnotationRect = (rect, pageHeight) => {
  if (!Array.isArray(rect) || rect.length !== 4) {
    return null;
  }

  const [x0, y0, x1, y1] = rect;

  return {
    left: Number(Math.min(x0, x1).toFixed(2)),
    right: Number(Math.max(x0, x1).toFixed(2)),
    top: Number((pageHeight - Math.max(y0, y1)).toFixed(2)),
    bottom: Number((pageHeight - Math.min(y0, y1)).toFixed(2)),
  };
};

const buildPageAnnotations = async (page, pageHeight) => {
  const annotations = await page.getAnnotations().catch(() => []);

  return annotations
    .map((annotation, index) => {
      const rect = normalizeAnnotationRect(annotation.rect, pageHeight);

      if (!rect) {
        return null;
      }

      return {
        id: annotation.id || `annotation-${index + 1}`,
        subtype: annotation.subtype || "Annot",
        url: annotation.url || annotation.unsafeUrl || "",
        rect,
      };
    })
    .filter(Boolean);
};

const extractTextItemsAndMarkedContent = (
  textContent,
  viewportHeight,
  pageIndex,
  allFontSizes,
  resolveFontMetadata
) => {
  const textItems = [];
  const markedContentMap = new Map();
  const markedContentStack = [];

  textContent.items.forEach((item, itemIndex) => {
    if (
      item.type === "beginMarkedContentProps" ||
      item.type === "beginMarkedContent"
    ) {
      markedContentStack.push(item.id || null);
      return;
    }

    if (item.type === "endMarkedContent") {
      markedContentStack.pop();
      return;
    }

    const rawText = String(item.str || "");
    const displayText = normalizeWhitespace(rawText);
    const height = Math.abs(item.transform?.[3] || 0);
    const fontSize = Number(height.toFixed(2));
    const top = viewportHeight - (item.transform?.[5] || 0);
    const left = Number((item.transform?.[4] || 0).toFixed(2));
    const fontMetadata = resolveFontMetadata(item.fontName);

    if (fontSize) {
      allFontSizes.push(fontSize);
    }

    const metric = {
      id: `text-item-${pageIndex}-${itemIndex + 1}`,
      text: displayText,
      left,
      top: Number(top.toFixed(2)),
      width: Number((item.width || 0).toFixed(2)),
      height: Number(height.toFixed(2)),
      fontName: item.fontName || "unknown",
      fontSize,
      rawText,
      hasEOL: Boolean(item.hasEOL),
      bold: fontMetadata.bold,
      italic: fontMetadata.italic,
      baseFontName: fontMetadata.baseName,
    };

    if (displayText) {
      textItems.push(metric);
    }

    markedContentStack.forEach((markedContentId) => {
      if (!markedContentId) {
        return;
      }

      const existing = markedContentMap.get(markedContentId) || {
        id: markedContentId,
        textParts: [],
        left,
        top: Number(top.toFixed(2)),
        fontSize: 0,
      };

      existing.textParts.push(rawText);
      existing.left = Math.min(existing.left, left);
      existing.top = Math.min(existing.top, Number(top.toFixed(2)));
      existing.fontSize = Math.max(existing.fontSize, fontSize);
      markedContentMap.set(markedContentId, existing);
    });
  });

  const finalizedMarkedContentMap = new Map(
    Array.from(markedContentMap.entries()).map(([id, entry]) => [
      id,
      {
        id,
        text: normalizeWhitespace(entry.textParts.join("")),
        left: entry.left,
        top: entry.top,
        fontSize: entry.fontSize,
      },
    ])
  );

  return {
    textItems,
    markedContentMap: finalizedMarkedContentMap,
  };
};

const deriveNativeNodeLabel = (role, text, pageIndex, childrenCount) => {
  switch (role) {
    case "Document":
      return "Document";
    case "Page":
      return `Page ${pageIndex}`;
    case "Part":
      return "Part";
    case "Art":
      return "Art";
    case "Sect":
      return "Section";
    case "Div":
      return "Division";
    case "BlockQuote":
      return text ? truncateText(text) : "Block quote";
    case "Caption":
      return text ? truncateText(text) : "Caption";
    case "TOC":
      return "Table of contents";
    case "TOCI":
      return text ? truncateText(text) : "TOC item";
    case "Index":
      return "Index";
    case "Private":
      return "Private";
    case "NonStruct":
      return text ? truncateText(text) : "Non-structural";
    case "L":
      return `List (${childrenCount} items)`;
    case "LI":
      return text ? truncateText(text) : "List item";
    case "Lbl":
      return text ? truncateText(text) : "List label";
    case "LBody":
      return text ? truncateText(text) : "List body";
    case "Table":
      return `Table (${childrenCount} rows)`;
    case "TR":
      return text ? truncateText(text) : "Table row";
    case "TH":
      return text ? truncateText(text) : "Header cell";
    case "TD":
      return text ? truncateText(text) : "Cell";
    case "THead":
      return "Table head";
    case "TBody":
      return "Table body";
    case "TFoot":
      return "Table footer";
    case "Figure":
      return text ? truncateText(text) : "Figure";
    case "Formula":
      return text ? truncateText(text) : "Formula";
    case "Form":
      return text ? truncateText(text) : "Form";
    case "Artifact":
      return text ? truncateText(text) : "Artifact";
    default:
      if (/^H[1-6]$/.test(role)) {
        return text ? truncateText(text) : role;
      }

      return text ? truncateText(text) : role;
  }
};

const buildNativeStructureForPage = (structTree, pageIndex, markedContentMap) => {
  if (!structTree?.children?.length) {
    return null;
  }

  const topLevelChildren =
    structTree.children.length === 1 &&
    structTree.children[0]?.role === "Document"
      ? structTree.children[0].children || []
      : structTree.children;

  let sequence = 0;

  const visitNode = (node) => {
    if (!node) {
      return null;
    }

    if (node.type === "content") {
      const content = markedContentMap.get(node.id);

      return {
        node: null,
        text: content?.text || "",
        metrics: content
          ? {
              left: content.left,
              top: content.top,
              fontSize: content.fontSize,
            }
          : null,
        contentIds: node.id ? [node.id] : [],
      };
    }

    const childResults = (node.children || []).map(visitNode).filter(Boolean);
    const children = childResults.map((result) => result.node).filter(Boolean);
    const text = normalizeWhitespace(
      childResults.map((result) => result.text).join(" ")
    );
    const metrics = childResults.reduce(
      (current, result) => mergeMetrics(current, result.metrics),
      null
    );
    const contentIds = [
      ...new Set(childResults.flatMap((result) => result.contentIds || [])),
    ];
    const role = String(node.role || "NonStruct");
    sequence += 1;

    const nodeId = `native-${pageIndex}-${sequence}`;
    const meta = {
      pageIndex,
      native: true,
      text,
      contentIds,
      ...(metrics || {}),
    };

    if (role === "Figure") {
      meta.sourceBlockId = nodeId;
    }

    return {
      node: buildTagNode(
        nodeId,
        role,
        deriveNativeNodeLabel(role, text, pageIndex, children.length),
        meta,
        children
      ),
      text,
      metrics,
      contentIds,
    };
  };

  const pageChildren = topLevelChildren
    .map(visitNode)
    .map((result) => result?.node)
    .filter(Boolean);

  if (!pageChildren.length) {
    return null;
  }

  return buildTagNode(
    `page-${pageIndex}`,
    "Page",
    `Page ${pageIndex}`,
    { pageIndex, native: true },
    pageChildren
  );
};

const extractFigureBlocksFromTree = (pageNode) => {
  const figures = [];
  let figureIndex = 0;

  const walk = (node) => {
    if (node.type === "Figure") {
      figureIndex += 1;
      figures.push({
        id: `image-${node.meta?.pageIndex || 1}-${figureIndex}`,
        type: "image",
        pageIndex: node.meta?.pageIndex || 1,
        imageIndex: figureIndex,
        top: Number((node.meta?.top || 0).toFixed(2)),
        left: Number((node.meta?.left || 0).toFixed(2)),
        width: 240,
        height: 160,
        inferred: false,
        source: "pdf-struct-tree",
        sourceBlockId: node.id,
      });
    }

    (node.children || []).forEach(walk);
  };

  walk(pageNode);

  return figures;
};

const detectImagesForPage = (operatorList, pageIndex, pageHeight, pdfjsLib) => {
  const imageOps = [
    pdfjsLib.OPS.paintImageXObject,
    pdfjsLib.OPS.paintInlineImageXObject,
    pdfjsLib.OPS.paintJpegXObject,
  ];

  const detectedImages = [];

  operatorList.fnArray.forEach((fn, index) => {
    if (!imageOps.includes(fn)) {
      return;
    }

    const args = operatorList.argsArray[index] || [];
    const width = Number(args[1]) || 0;
    const height = Number(args[2]) || 0;

    if ((width && width < 32) || (height && height < 32)) {
      return;
    }

    detectedImages.push({
      id: `image-${pageIndex + 1}-${detectedImages.length + 1}`,
      type: "image",
      pageIndex: pageIndex + 1,
      imageIndex: detectedImages.length + 1,
      top: Number(
        ((detectedImages.length + 1) * (pageHeight / (detectedImages.length + 2))).toFixed(2)
      ),
      left: 72,
      width: width || 240,
      height: height || 160,
      inferred: true,
      source: "pdf-operator-list",
    });
  });

  return detectedImages;
};

const extractOcrTextBlocks = async (page, pageIndex, allFontSizes) => {
  const renderScale = 2.5;
  const renderViewport = page.getViewport({ scale: renderScale });
  const canvas = createCanvas(
    Math.ceil(renderViewport.width),
    Math.ceil(renderViewport.height)
  );
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport: renderViewport,
  }).promise;

  const imageBuffer = canvas.toBuffer("image/png");
  const worker = await getOcrWorker();
  const result = await worker.recognize(
    imageBuffer,
    { rotateAuto: true },
    { blocks: true }
  );

  const textBlocks = (result.data.blocks || [])
    .flatMap((block) => block.paragraphs || [])
    .flatMap((paragraph) => paragraph.lines || [])
    .map((line, index) => {
      const text = normalizeWhitespace(line.text || "");

      if (!text) {
        return null;
      }

      const left = Number((line.bbox.x0 / renderScale).toFixed(2));
      const top = Number((line.bbox.y0 / renderScale).toFixed(2));
      const width = Number(
        ((line.bbox.x1 - line.bbox.x0) / renderScale).toFixed(2)
      );
      const height = Number(
        ((line.bbox.y1 - line.bbox.y0) / renderScale).toFixed(2)
      );
      const fontSize = Number(height.toFixed(2));

      if (fontSize) {
        allFontSizes.push(fontSize);
      }

      return {
        id: `ocr-block-${pageIndex}-${index + 1}`,
        type: "text",
        text,
        top,
        left,
        width,
        height,
        fontSize,
        fontNames: ["ocr"],
        itemCount: text.split(/\s+/).filter(Boolean).length,
        items: [],
        source: "ocr",
      };
    })
    .filter(Boolean);

  return {
    textBlocks,
    confidence: result.data.confidence || 0,
    text: normalizeWhitespace(result.data.text || ""),
  };
};

const parsePdf = async (filePath) => {
  const pdfjsLib = await getPdfJs();
  const data = new Uint8Array(await fs.readFile(filePath));
  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const pdfDocument = await loadingTask.promise;
  const pages = [];
  const nativeStructurePages = [];
  const allFontSizes = [];
  let totalImages = 0;

  for (let pageIndex = 0; pageIndex < pdfDocument.numPages; pageIndex += 1) {
    const page = await pdfDocument.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent({ includeMarkedContent: true });
    const operatorList = await page.getOperatorList();
    const structTree = await page.getStructTree().catch(() => null);
    const resolveFontMetadata = getFontMetadataResolver(page);
    const annotations = await buildPageAnnotations(page, viewport.height);

    const { textItems, markedContentMap } = extractTextItemsAndMarkedContent(
      textContent,
      viewport.height,
      pageIndex + 1,
      allFontSizes,
      resolveFontMetadata
    );

    let textBlocks = groupTextItemsIntoBlocks(textItems);
    const nativePageNode = buildNativeStructureForPage(
      structTree,
      pageIndex + 1,
      markedContentMap
    );

    if (nativePageNode) {
      nativeStructurePages.push(nativePageNode);
    }

    let imageBlocks = nativePageNode
      ? extractFigureBlocksFromTree(nativePageNode)
      : detectImagesForPage(operatorList, pageIndex, viewport.height, pdfjsLib);

    let usedOcrFallback = false;

    if (!nativePageNode && !textBlocks.length && imageBlocks.length) {
      const ocrOutput = await extractOcrTextBlocks(
        page,
        pageIndex + 1,
        allFontSizes
      );

      if (ocrOutput.textBlocks.length) {
        textBlocks = ocrOutput.textBlocks;
        imageBlocks = [];
        usedOcrFallback = true;
      }
    }

    totalImages += imageBlocks.length;

    pages.push({
      pageIndex: pageIndex + 1,
      width: Number(viewport.width.toFixed(2)),
      height: Number(viewport.height.toFixed(2)),
      rotation: viewport.rotation,
      textBlocks,
      imageBlocks,
      annotations,
      metadata: {
        textBlockCount: textBlocks.length,
        imageBlockCount: imageBlocks.length,
        textLength: textBlocks.reduce((sum, block) => sum + block.text.length, 0),
        hasNativeStructure: Boolean(nativePageNode),
        usedOcrFallback,
      },
    });
  }

  const structureTreeRoot = nativeStructurePages.length
    ? buildTagNode("document-root", "Document", "Document", { native: true }, nativeStructurePages)
    : null;
  const extractedTags = structureTreeRoot
    ? buildExtractedTagsDataset({
        root: structureTreeRoot,
        pageCount: pdfDocument.numPages,
        extractionMode: "native-struct-tree",
      })
    : {
        ...createEmptyExtractedTags(pdfDocument.numPages, "fallback-inference"),
        root: null,
      };

  return {
    document: {
      pageCount: pdfDocument.numPages,
      totalImages,
      extractedAt: new Date().toISOString(),
      medianFontSize: Number(median(allFontSizes).toFixed(2)),
      hasNativeStructureTree: Boolean(structureTreeRoot),
      tagExtractionMode: structureTreeRoot
        ? "native-struct-tree"
        : "fallback-inference",
      extractedTagCount: extractedTags.summary.dedupedCount,
    },
    pages,
    extractedTags,
    structureTree: extractedTags.root
      ? {
          root: extractedTags.root,
        }
      : null,
  };
};

module.exports = {
  parsePdf,
};
