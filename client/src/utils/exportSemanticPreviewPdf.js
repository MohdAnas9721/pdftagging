const DEFAULT_TEXT = "No semantic preview content available.";

const BLOCK_TAGS = new Set([
  "article",
  "blockquote",
  "div",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "li",
  "main",
  "nav",
  "p",
  "pre",
  "section",
]);

const PAGE = {
  borderInset: 12,
  bottomInset: 28,
  marginX: 20,
  topInset: 24,
};

const HEADING_SIZES = {
  h1: 28,
  h2: 24,
  h3: 21,
  h4: 18,
  h5: 16,
  h6: 15,
};

const BLOCK_SPACING = {
  article: 14,
  blockquote: 14,
  figcaption: 10,
  figure: 12,
  footer: 10,
  h1: 22,
  h2: 18,
  h3: 16,
  h4: 14,
  h5: 12,
  h6: 10,
  header: 12,
  li: 6,
  main: 12,
  nav: 10,
  p: 12,
  pre: 14,
  section: 12,
};

const getExportHtml = (html) => {
  const content = String(html || "").trim();
  return content || DEFAULT_TEXT;
};

const combineFontStyle = (current, next) => {
  const currentValue = String(current || "normal").toLowerCase();
  const nextValue = String(next || "normal").toLowerCase();
  const hasBold =
    currentValue.includes("bold") || nextValue.includes("bold");
  const hasItalic =
    currentValue.includes("italic") || nextValue.includes("italic");

  if (hasBold && hasItalic) {
    return "bolditalic";
  }

  if (hasBold) {
    return "bold";
  }

  if (hasItalic) {
    return "italic";
  }

  return "normal";
};

const cloneStyle = (style) => ({
  color: [...style.color],
  fontFamily: style.fontFamily,
  fontSize: style.fontSize,
  fontStyle: style.fontStyle,
  preserveWhitespace: Boolean(style.preserveWhitespace),
  underline: Boolean(style.underline),
});

const getDefaultStyle = () => ({
  color: [24, 24, 27],
  fontFamily: "times",
  fontSize: 13,
  fontStyle: "normal",
  preserveWhitespace: false,
  underline: false,
});

const applyTagStyle = (inputStyle, tagName) => {
  const tag = String(tagName || "").toLowerCase();
  const style = cloneStyle(inputStyle);

  if (HEADING_SIZES[tag]) {
    style.fontFamily = "times";
    style.fontSize = HEADING_SIZES[tag];
    style.fontStyle = "bold";
    style.color = [17, 24, 39];
    return style;
  }

  switch (tag) {
    case "strong":
    case "b":
    case "th":
      style.fontStyle = combineFontStyle(style.fontStyle, "bold");
      return style;
    case "em":
    case "i":
      style.fontStyle = combineFontStyle(style.fontStyle, "italic");
      return style;
    case "blockquote":
      style.fontStyle = combineFontStyle(style.fontStyle, "italic");
      style.color = [71, 85, 105];
      return style;
    case "code":
    case "pre":
      style.fontFamily = "courier";
      style.fontSize = Math.max(11, style.fontSize - 1);
      style.color = [31, 41, 55];
      style.preserveWhitespace = true;
      return style;
    case "a":
      style.color = [29, 78, 216];
      style.underline = true;
      return style;
    case "small":
    case "figcaption":
      style.fontSize = Math.max(10.5, style.fontSize - 1.5);
      style.color = [82, 82, 91];
      return style;
    case "mark":
      style.color = [146, 64, 14];
      return style;
    case "del":
      style.color = [120, 113, 108];
      return style;
    case "sup":
    case "sub":
      style.fontSize = Math.max(10.5, style.fontSize - 2);
      return style;
    default:
      return style;
  }
};

const getBlockSpacing = (tag) => BLOCK_SPACING[tag] ?? 10;

const createBlock = ({
  indent = 0,
  marker = "",
  markerStyle = null,
  style,
  tag = "p",
}) => ({
  indent,
  marker,
  markerStyle: markerStyle ? cloneStyle(markerStyle) : cloneStyle(style),
  segments: [],
  style: cloneStyle(style),
  tag,
});

const blockHasVisibleContent = (block) =>
  block.segments.some((segment) => String(segment.text || "").trim().length);

const normalizeTextContent = (text, preserveWhitespace) => {
  const value = String(text || "").replace(/\r/g, "");

  if (preserveWhitespace) {
    return value;
  }

  return value.replace(/\s+/g, " ");
};

const tokenizeText = (text, preserveWhitespace) => {
  if (preserveWhitespace) {
    return String(text).split(/(\n| +)/);
  }

  return String(text).split(/(\n|\s+)/);
};

const buildBlocksFromHtml = (html) => {
  if (typeof document === "undefined") {
    return [
      createBlock({
        style: getDefaultStyle(),
        tag: "p",
      }),
    ].map((block) => ({
      ...block,
      segments: [{ style: getDefaultStyle(), text: getExportHtml(html) }],
    }));
  }

  const container = document.createElement("div");
  container.innerHTML = getExportHtml(html);

  const blocks = [];
  const state = {
    currentBlock: null,
    listStack: [],
  };

  const flushCurrentBlock = () => {
    if (!state.currentBlock) {
      return;
    }

    if (blockHasVisibleContent(state.currentBlock)) {
      blocks.push(state.currentBlock);
    }

    state.currentBlock = null;
  };

  const ensureParagraphBlock = (style) => {
    if (!state.currentBlock) {
      state.currentBlock = createBlock({
        style,
        tag: "p",
      });
    }

    return state.currentBlock;
  };

  const appendText = (text, style) => {
    const normalizedText = normalizeTextContent(
      text,
      style.preserveWhitespace
    );

    if (!normalizedText) {
      return;
    }

    const block = ensureParagraphBlock(style);
    block.segments.push({
      style: cloneStyle(style),
      text: normalizedText,
    });
  };

  const visit = (node, style) => {
    if (!node) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      appendText(node.textContent, style);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tag = node.tagName.toLowerCase();

    if (tag === "br") {
      appendText("\n", { ...style, preserveWhitespace: true });
      return;
    }

    if (tag === "ul" || tag === "ol") {
      flushCurrentBlock();
      state.listStack.push({ index: 0, type: tag });
      Array.from(node.childNodes).forEach((child) => visit(child, style));
      state.listStack.pop();
      flushCurrentBlock();
      return;
    }

    if (tag === "li") {
      flushCurrentBlock();

      const listContext = state.listStack[state.listStack.length - 1];
      const listDepth = Math.max(state.listStack.length - 1, 0);
      const nextStyle = applyTagStyle(style, tag);
      const marker =
        listContext?.type === "ol"
          ? `${(listContext.index += 1)}.`
          : "\u2022";

      state.currentBlock = createBlock({
        indent: 18 + listDepth * 18,
        marker,
        markerStyle: nextStyle,
        style: nextStyle,
        tag,
      });

      Array.from(node.childNodes).forEach((child) => visit(child, nextStyle));
      flushCurrentBlock();
      return;
    }

    const nextStyle = applyTagStyle(style, tag);

    if (BLOCK_TAGS.has(tag)) {
      flushCurrentBlock();
      state.currentBlock = createBlock({
        style: nextStyle,
        tag,
      });
      Array.from(node.childNodes).forEach((child) => visit(child, nextStyle));
      flushCurrentBlock();
      return;
    }

    Array.from(node.childNodes).forEach((child) => visit(child, nextStyle));
  };

  Array.from(container.childNodes).forEach((child) =>
    visit(child, getDefaultStyle())
  );
  flushCurrentBlock();

  if (!blocks.length) {
    return [
      {
        ...createBlock({
          style: getDefaultStyle(),
          tag: "p",
        }),
        segments: [
          {
            style: getDefaultStyle(),
            text: DEFAULT_TEXT,
          },
        ],
      },
    ];
  }

  return blocks;
};

const applyPdfTextStyle = (doc, style) => {
  doc.setFont(style.fontFamily, style.fontStyle);
  doc.setFontSize(style.fontSize);
  doc.setTextColor(...style.color);
};

const getTokenWidth = (doc, token, style) => {
  if (!token) {
    return 0;
  }

  applyPdfTextStyle(doc, style);
  return doc.getTextWidth(token);
};

const drawPageFrame = (doc) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(196, 196, 196);
  doc.setLineWidth(0.6);
  doc.rect(
    PAGE.borderInset,
    PAGE.borderInset,
    pageWidth - PAGE.borderInset * 2,
    pageHeight - PAGE.borderInset * 2
  );

  return {
    bottomLimit: pageHeight - PAGE.bottomInset,
    startX: PAGE.marginX,
    startY: PAGE.topInset + 8,
    width: pageWidth - PAGE.marginX * 2,
  };
};

const createPageState = (doc) => ({
  frame: drawPageFrame(doc),
  y: PAGE.topInset + 8,
});

const ensurePageRoom = (doc, pageState, requiredHeight) => {
  if (pageState.y + requiredHeight <= pageState.frame.bottomLimit) {
    return;
  }

  doc.addPage();
  pageState.frame = drawPageFrame(doc);
  pageState.y = pageState.frame.startY;
};

const renderInlineText = (doc, text, style, lineState, pageState) => {
  const tokens = tokenizeText(text, style.preserveWhitespace);

  tokens.forEach((token) => {
    if (token === "") {
      return;
    }

    if (token === "\n") {
      lineState.x = lineState.startX;
      pageState.y += lineState.lineHeight;
      lineState.lineHeight = Math.max(
        lineState.baseLineHeight,
        lineState.lineHeight
      );
      ensurePageRoom(doc, pageState, lineState.lineHeight);
      return;
    }

    if (!style.preserveWhitespace && /^\s+$/.test(token)) {
      if (lineState.x === lineState.startX) {
        return;
      }
    }

    const tokenWidth = getTokenWidth(doc, token, style);

    if (
      lineState.x > lineState.startX &&
      lineState.x + tokenWidth > lineState.maxX &&
      !/^\s+$/.test(token)
    ) {
      lineState.x = lineState.startX;
      pageState.y += lineState.lineHeight;
      lineState.lineHeight = lineState.baseLineHeight;
      ensurePageRoom(doc, pageState, lineState.lineHeight);
    }

    if (!style.preserveWhitespace && /^\s+$/.test(token) && lineState.x === lineState.startX) {
      return;
    }

    applyPdfTextStyle(doc, style);
    doc.text(token, lineState.x, pageState.y);

    if (style.underline && token.trim()) {
      const underlineY = pageState.y + 1.5;
      doc.setDrawColor(...style.color);
      doc.setLineWidth(0.4);
      doc.line(lineState.x, underlineY, lineState.x + tokenWidth, underlineY);
    }

    lineState.x += tokenWidth;
    lineState.lineHeight = Math.max(
      lineState.lineHeight,
      style.fontSize * 1.45
    );
  });
};

const renderBlock = (doc, block, pageState) => {
  const spacingBefore = block.tag.startsWith("h")
    ? getBlockSpacing(block.tag)
    : pageState.y === pageState.frame.startY
      ? 0
      : Math.max(6, getBlockSpacing(block.tag) - 6);

  pageState.y += spacingBefore;

  const baseFontSize = block.style.fontSize;
  const baseLineHeight = Math.max(baseFontSize * 1.45, 16);
  ensurePageRoom(doc, pageState, baseLineHeight);

  const markerGap = block.marker ? 8 : 0;
  const markerWidth = block.marker
    ? getTokenWidth(doc, `${block.marker} `, block.markerStyle)
    : 0;

  const lineState = {
    baseLineHeight,
    lineHeight: baseLineHeight,
    maxX: pageState.frame.startX + pageState.frame.width,
    startX:
      pageState.frame.startX + block.indent + (block.marker ? markerWidth + markerGap : 0),
    x:
      pageState.frame.startX + block.indent + (block.marker ? markerWidth + markerGap : 0),
  };

  if (block.marker) {
    applyPdfTextStyle(doc, block.markerStyle);
    doc.text(block.marker, pageState.frame.startX + block.indent, pageState.y);
  }

  block.segments.forEach((segment) => {
    renderInlineText(doc, segment.text, segment.style, lineState, pageState);
  });

  pageState.y += lineState.lineHeight;
  pageState.y += Math.max(2, getBlockSpacing(block.tag) * 0.55);
};

export const exportSemanticPreviewPdf = async (
  html,
  filename = "semantic-preview.pdf"
) => {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    compress: true,
    format: "a4",
    orientation: "portrait",
    unit: "pt",
  });

  const blocks = buildBlocksFromHtml(html);
  const pageState = createPageState(doc);

  blocks.forEach((block) => {
    renderBlock(doc, block, pageState);
  });

  doc.save(filename);
};
