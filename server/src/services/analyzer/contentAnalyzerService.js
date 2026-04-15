const {
  getFallbackTagForRole,
  getRoleForTag,
  normalizeTagName,
  resolveBlockTag,
} = require("../../utils/tagging");

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .replace(/\s([,.;:!?])/g, "$1")
    .trim();

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
  /^((\d+[\.\)])|([a-zA-Z][\.\)])|[-*•+])\s+/.test(text.trim());

const extractListMarker = (text) => {
  const match = text.trim().match(/^((\d+[\.\)])|([a-zA-Z][\.\)])|[-*•+])\s+(.*)$/);

  if (!match) {
    return null;
  }

  return {
    marker: match[1],
    body: normalizeWhitespace(match[4]),
  };
};

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

const isLinkText = (text) =>
  /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.\w+)/i.test(text);

const isCodeText = (block, text) =>
  (block.fontNames || []).some((fontName) => /mono|courier|code/i.test(fontName)) ||
  (/^[\s`]/.test(text) && /[`{};]/.test(text)) ||
  (/[{};<>]/.test(text) && text.length < 200);

const isQuoteText = (text, block) =>
  /^["“].+["”]$/.test(text) || block.left >= 110;

const isNoteText = (text) => /^(note|warning|important)\b[:\s-]/i.test(text);

const isReferenceText = (text) =>
  /^\[(\d+|[a-z]+)\]/i.test(text) || /^references?\b/i.test(text);

const shouldTreatAsHeading = (block, text, baselineSize, blockIndex) => {
  const shortText = text.length <= 120;
  const isUppercaseTitle = text === text.toUpperCase() && text.length <= 80;
  const looksLikeTitle = /^[A-Z][\w\s,:/-]+$/.test(text) && text.length <= 90;

  if (block.fontSize >= baselineSize * 1.3 && shortText) {
    return true;
  }

  if (blockIndex <= 1 && block.fontSize >= baselineSize * 1.18 && shortText) {
    return true;
  }

  return (isUppercaseTitle || looksLikeTitle) && block.fontSize >= baselineSize * 1.12;
};

const buildSemanticBlock = ({
  id,
  pageIndex,
  sourceBlockId,
  top,
  left,
  text,
  fontSize,
  role,
  details = {},
}) => ({
  id,
  pageIndex,
  sourceBlockId,
  top,
  left,
  text: normalizeWhitespace(text),
  fontSize,
  role,
  details,
});

const finalizeBlockTag = (block) => {
  const semanticTag =
    block.details?.semanticTag || getFallbackTagForRole(block.role, block.details);
  const resolved = resolveBlockTag({
    ...block,
    details: {
      ...block.details,
      semanticTag,
    },
  });
  const resolvedRole = getRoleForTag(resolved.tag) || block.role;
  const nextDetails = {
    ...block.details,
    semanticTag,
    tagSource: resolved.source,
  };

  if (resolvedRole === "heading" && /^H[1-6]$/.test(resolved.tag)) {
    nextDetails.level = Number(resolved.tag.slice(1));
  }

  return {
    ...block,
    role: resolvedRole,
    tag: resolved.tag,
    tagSource: resolved.source,
    details: nextDetails,
  };
};

const finalizePages = (pages) =>
  pages.map((page) => ({
    ...page,
    blocks: page.blocks.map(finalizeBlockTag),
  }));

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

const getSourceBlocks = (page, sourceBlockId) => {
  const sourceIds = String(sourceBlockId || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!sourceIds.length) {
    return [];
  }

  const blockMap = new Map(page.textBlocks.map((block) => [block.id, block]));
  return sourceIds.map((id) => blockMap.get(id)).filter(Boolean);
};

const getOverlapWidth = (startA, endA, startB, endB) =>
  Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));

const findLinkAnnotation = (item, annotations = []) =>
  annotations.find((annotation) => {
    if (annotation.subtype !== "Link") {
      return false;
    }

    const itemRight = item.left + item.width;
    const itemBottom = item.top + item.height;
    const horizontalOverlap = getOverlapWidth(
      item.left,
      itemRight,
      annotation.rect.left,
      annotation.rect.right
    );
    const verticalOverlap = getOverlapWidth(
      item.top,
      itemBottom,
      annotation.rect.top,
      annotation.rect.bottom
    );

    return horizontalOverlap >= Math.max(4, item.width * 0.15) && verticalOverlap > 0;
  }) || null;

const expandRangeToWordBoundaries = (text, start, end) => {
  let nextStart = start;
  let nextEnd = end;

  while (nextStart > 0 && /\S/.test(text[nextStart - 1]) && /\S/.test(text[nextStart])) {
    nextStart -= 1;
  }

  while (
    nextEnd < text.length &&
    /\S/.test(text[nextEnd - 1] || "") &&
    /\S/.test(text[nextEnd] || "")
  ) {
    nextEnd += 1;
  }

  return {
    start: nextStart,
    end: nextEnd,
  };
};

const extractLinkedText = (item, annotation) => {
  const text = item.text || "";

  if (!text.trim() || !item.width) {
    return null;
  }

  const relativeStart = Math.max(
    0,
    Math.min(1, (annotation.rect.left - item.left) / item.width)
  );
  const relativeEnd = Math.max(
    relativeStart,
    Math.min(1, (annotation.rect.right - item.left) / item.width)
  );

  let start = Math.floor(relativeStart * text.length);
  let end = Math.ceil(relativeEnd * text.length);

  if (end <= start) {
    end = Math.min(text.length, start + 1);
  }

  const expanded = expandRangeToWordBoundaries(text, start, end);
  const linkedText = text
    .slice(expanded.start, expanded.end)
    .trim()
    .replace(/^[^\w]+|[^\w]+$/g, "");

  if (!linkedText) {
    return null;
  }

  return {
    start: expanded.start,
    end: expanded.end,
    text: linkedText,
  };
};

const detectScriptTag = (items, itemIndex, item, baselineFontSize, baselineTop) => {
  if (
    !item.fontSize ||
    !baselineFontSize ||
    item.fontSize >= baselineFontSize
  ) {
    return null;
  }

  const previousText = normalizeWhitespace(items[itemIndex - 1]?.text || "");

  if (/\bsub$/i.test(previousText)) {
    return "sub";
  }

  if (/\bsuper$/i.test(previousText) || /\bsup$/i.test(previousText)) {
    return "sup";
  }

  const baselineOffset = (item.top || 0) - (baselineTop || 0);

  if (baselineOffset >= 2) {
    return "sup";
  }

  if (baselineOffset <= -2) {
    return "sub";
  }

  return "sub";
};

const buildInlineSegmentsForItem = (
  item,
  itemIndex,
  items,
  annotations,
  baselineFontSize,
  baselineTop
) => {
  const segments = [];
  const linkAnnotation = findLinkAnnotation(item, annotations);
  const text = item.text || "";
  const scriptTag = detectScriptTag(
    items,
    itemIndex,
    item,
    baselineFontSize,
    baselineTop
  );

  const pushSegment = (segmentText, extra = {}) => {
    const normalizedText = normalizeWhitespace(segmentText);

    if (!normalizedText) {
      return;
    }

    const fontDelta = Math.abs((item.fontSize || 0) - (baselineFontSize || item.fontSize || 0));
    const raised = (baselineTop || 0) - (item.top || 0);
    const lowered = (item.top || 0) - (baselineTop || 0);
    const tags = [];

    if (extra.href) {
      tags.push("Link");
    }

    if (item.bold) {
      tags.push("strong");
    }

    if (item.italic) {
      tags.push("em");
    }

    if (extra.script === "sup") {
      tags.push("sup");
    }

    if (extra.script === "sub") {
      tags.push("sub");
    }

    const useSpan =
      (!extra.script && fontDelta >= 2) ||
      extra.styleVariant === "font-size" ||
      extra.styleVariant === "style-span";

    if (useSpan) {
      tags.push("Span");
    }

    if (!tags.length) {
      return;
    }

    segments.push({
      kind: "segment",
      text: normalizedText,
      tags,
      href: extra.href || "",
      fontSize: item.fontSize || 0,
      raised: Number(raised.toFixed(2)),
      lowered: Number(lowered.toFixed(2)),
    });
  };

  if (linkAnnotation) {
    const linkedRange = extractLinkedText(item, linkAnnotation);

    if (linkedRange) {
      pushSegment(linkedRange.text, {
        href: linkAnnotation.url,
      });
    } else {
      pushSegment(text, { href: linkAnnotation.url });
    }
  }

  const baselineDelta = Math.abs((item.fontSize || 0) - (baselineFontSize || item.fontSize || 0));
  const sizeThreshold = Math.max(1.25, (baselineFontSize || item.fontSize || 0) * 0.15);

  if (item.bold || item.italic) {
    pushSegment(text);
  }

  if (
    baselineDelta >= sizeThreshold &&
    !item.bold &&
    !item.italic &&
    !linkAnnotation &&
    !scriptTag
  ) {
    pushSegment(text, { styleVariant: "font-size" });
  }

  if (scriptTag) {
    pushSegment(text, { script: scriptTag });
  }

  if (item.hasEOL) {
    segments.push({
      kind: "break",
      type: "br",
    });
  }

  return segments;
};

const buildInlineNodes = (page, sourceBlockId) => {
  const sourceBlocks = getSourceBlocks(page, sourceBlockId);

  if (!sourceBlocks.length) {
    return [];
  }

  const inlineNodes = [];

  sourceBlocks.forEach((block, blockIndex) => {
    const items = [...(block.items || [])].sort((a, b) => a.left - b.left);
    const baselineFontSize = median(
      items.map((item) => Number(item.fontSize || 0)).filter(Boolean)
    );
    const baselineTop = median(items.map((item) => Number(item.top || 0)).filter(Boolean));

    const pushInlineNode = (node) => {
      const previousNode = inlineNodes[inlineNodes.length - 1];

      if (node.kind === "break" && previousNode?.kind === "break") {
        return;
      }

      inlineNodes.push(node);
    };

    items.forEach((item, itemIndex) => {
      buildInlineSegmentsForItem(
        item,
        itemIndex,
        items,
        page.annotations || [],
        baselineFontSize || block.fontSize || 0,
        baselineTop || block.top || 0
      ).forEach(pushInlineNode);
    });

    if (blockIndex < sourceBlocks.length - 1) {
      pushInlineNode({
        kind: "break",
        type: "br",
      });
    }
  });

  return inlineNodes;
};

const mergeParagraphBuffer = (page, buffer, blockIndex) => {
  if (!buffer.length) {
    return null;
  }

  const pageIndex = page.pageIndex;
  const sourceBlockId = buffer.map((block) => block.id).join(",");
  const text = normalizeWhitespace(buffer.map((block) => block.text).join(" "));
  const fontSize =
    buffer.reduce((sum, block) => sum + (block.fontSize || 0), 0) / buffer.length;

  return buildSemanticBlock({
    id: `semantic-${pageIndex}-${blockIndex}`,
    pageIndex,
    sourceBlockId,
    top: buffer[0].top,
    left: Math.min(...buffer.map((block) => block.left)),
    text,
    fontSize: Number(fontSize.toFixed(2)),
    role: "paragraph",
    details: {
      inlineNodes: buildInlineNodes(page, sourceBlockId),
    },
  });
};

const shouldContinueParagraph = (currentBuffer, nextBlock) => {
  if (!currentBuffer.length) {
    return false;
  }

  const previousBlock = currentBuffer[currentBuffer.length - 1];
  const verticalGap = nextBlock.top - previousBlock.top;
  const leftShift = Math.abs(nextBlock.left - previousBlock.left);
  const fontDelta = Math.abs((nextBlock.fontSize || 0) - (previousBlock.fontSize || 0));

  return verticalGap <= Math.max(previousBlock.height * 2, 22) && leftShift <= 24 && fontDelta <= 1.5;
};

const inferSemanticBlocks = (page, baselineSize) => {
  const blocks = [];
  const sortedBlocks = [...page.textBlocks].sort((a, b) => a.top - b.top || a.left - b.left);
  let paragraphBuffer = [];
  let semanticIndex = 1;

  const flushParagraph = () => {
    const paragraph = mergeParagraphBuffer(page, paragraphBuffer, semanticIndex);

    if (paragraph) {
      blocks.push(paragraph);
      semanticIndex += 1;
    }

    paragraphBuffer = [];
  };

  sortedBlocks.forEach((block, blockIndex) => {
    const text = normalizeWhitespace(block.text);
    const selectedTag = normalizeTagName(block.selectedTag);

    if (!text) {
      return;
    }

    if (selectedTag) {
      flushParagraph();
      const selectedRole = getRoleForTag(selectedTag) || "paragraph";
      blocks.push(
        buildSemanticBlock({
          id: `semantic-${page.pageIndex}-${semanticIndex}`,
          pageIndex: page.pageIndex,
          sourceBlockId: block.sourceBlockId || block.id,
          top: block.top,
          left: block.left,
          text,
          fontSize: block.fontSize,
          role: selectedRole,
          details: {
            selectedTag,
            semanticTag: selectedTag,
            ...(selectedRole === "heading" && /^H[1-6]$/.test(selectedTag)
              ? { level: Number(selectedTag.slice(1)) }
              : {}),
            inlineNodes:
              selectedRole === "heading" || selectedRole === "paragraph"
                ? buildInlineNodes(page, block.sourceBlockId || block.id)
                : [],
          },
        })
      );
      semanticIndex += 1;
      return;
    }

    if (isLikelyTableRow(text)) {
      flushParagraph();
      blocks.push(
        buildSemanticBlock({
          id: `semantic-${page.pageIndex}-${semanticIndex}`,
          pageIndex: page.pageIndex,
          sourceBlockId: block.id,
          top: block.top,
          left: block.left,
          text,
          fontSize: block.fontSize,
          role: "table_row",
          details: {
            cells: normalizeTableCells(text),
          },
        })
      );
      semanticIndex += 1;
      return;
    }

    if (isListItem(text)) {
      flushParagraph();
      const listItem = extractListMarker(text);
      blocks.push(
        buildSemanticBlock({
          id: `semantic-${page.pageIndex}-${semanticIndex}`,
          pageIndex: page.pageIndex,
          sourceBlockId: block.id,
          top: block.top,
          left: block.left,
          text: listItem?.body || text,
          fontSize: block.fontSize,
          role: "list_item",
          details: {
            marker: listItem?.marker || "",
            listType: /^\d/.test(listItem?.marker || "") ? "ol" : "ul",
          },
        })
      );
      semanticIndex += 1;
      return;
    }

    if (shouldTreatAsHeading(block, text, baselineSize, blockIndex)) {
      flushParagraph();
      blocks.push(
        buildSemanticBlock({
          id: `semantic-${page.pageIndex}-${semanticIndex}`,
          pageIndex: page.pageIndex,
          sourceBlockId: block.id,
          top: block.top,
          left: block.left,
          text,
          fontSize: block.fontSize,
          role: "heading",
          details: {
            level: getHeadingLevel(block.fontSize, baselineSize),
            inlineNodes: buildInlineNodes(page, block.id),
          },
        })
      );
      semanticIndex += 1;
      return;
    }

    if (isLinkText(text)) {
      flushParagraph();
      blocks.push(
        buildSemanticBlock({
          id: `semantic-${page.pageIndex}-${semanticIndex}`,
          pageIndex: page.pageIndex,
          sourceBlockId: block.id,
          top: block.top,
          left: block.left,
          text,
          fontSize: block.fontSize,
          role: "link",
          details: {
            href: text,
          },
        })
      );
      semanticIndex += 1;
      return;
    }

    if (isCodeText(block, text)) {
      flushParagraph();
      blocks.push(
        buildSemanticBlock({
          id: `semantic-${page.pageIndex}-${semanticIndex}`,
          pageIndex: page.pageIndex,
          sourceBlockId: block.id,
          top: block.top,
          left: block.left,
          text,
          fontSize: block.fontSize,
          role: "code",
        })
      );
      semanticIndex += 1;
      return;
    }

    if (isNoteText(text)) {
      flushParagraph();
      blocks.push(
        buildSemanticBlock({
          id: `semantic-${page.pageIndex}-${semanticIndex}`,
          pageIndex: page.pageIndex,
          sourceBlockId: block.id,
          top: block.top,
          left: block.left,
          text,
          fontSize: block.fontSize,
          role: "note",
        })
      );
      semanticIndex += 1;
      return;
    }

    if (isReferenceText(text)) {
      flushParagraph();
      blocks.push(
        buildSemanticBlock({
          id: `semantic-${page.pageIndex}-${semanticIndex}`,
          pageIndex: page.pageIndex,
          sourceBlockId: block.id,
          top: block.top,
          left: block.left,
          text,
          fontSize: block.fontSize,
          role: "reference",
        })
      );
      semanticIndex += 1;
      return;
    }

    if (isQuoteText(text, block)) {
      flushParagraph();
      blocks.push(
        buildSemanticBlock({
          id: `semantic-${page.pageIndex}-${semanticIndex}`,
          pageIndex: page.pageIndex,
          sourceBlockId: block.id,
          top: block.top,
          left: block.left,
          text,
          fontSize: block.fontSize,
          role: "quote",
        })
      );
      semanticIndex += 1;
      return;
    }

    if (!paragraphBuffer.length || shouldContinueParagraph(paragraphBuffer, block)) {
      paragraphBuffer.push(block);
      return;
    }

    flushParagraph();
    paragraphBuffer.push(block);
  });

  flushParagraph();

  page.imageBlocks.forEach((image, index) => {
    blocks.push(
      buildSemanticBlock({
        id: `semantic-figure-${page.pageIndex}-${index + 1}`,
        pageIndex: page.pageIndex,
        sourceBlockId: image.sourceBlockId || image.id,
        top: image.top,
        left: image.left,
        text: "",
        fontSize: 0,
        role: "figure",
        details: {
          imageIndex: image.imageIndex,
          inferred: image.inferred,
        },
      })
    );
  });

  const normalizedBlocks = blocks.sort((a, b) => a.top - b.top || a.left - b.left);
  const headingSizes = [
    ...new Set(
      normalizedBlocks
        .filter((block) => block.role === "heading")
        .map((block) => Number(block.fontSize || 0))
        .filter(Boolean)
    ),
  ].sort((a, b) => b - a);

  normalizedBlocks.forEach((block) => {
    if (block.role !== "heading") {
      return;
    }

    const sizeRank = headingSizes.indexOf(Number(block.fontSize || 0));

    if (sizeRank >= 0) {
      block.details.level = Math.min(sizeRank + 1, 6);
    }
  });

  return normalizedBlocks;
};

const getNativeBlockSpec = (tag) => {
  const role = String(tag.tagName || "");
  const text = normalizeWhitespace(tag.text || "");

  if (/^H[1-6]$/.test(role)) {
    return {
      role: "heading",
      text,
      details: {
        level: Number(role.slice(1)),
        nativeTag: role,
      },
      recurseChildren: false,
    };
  }

  switch (role) {
    case "P":
    case "Span":
    case "Caption":
      return {
        role: "paragraph",
        text,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "Link":
    case "Annot":
      return {
        role: "link",
        text: text || tag.label,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "Code":
      return {
        role: "code",
        text,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "BlockQuote":
    case "Quote":
      return {
        role: "quote",
        text,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "Note":
      return {
        role: "note",
        text,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "Reference":
    case "BibEntry":
      return {
        role: "reference",
        text,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "LI":
      return {
        role: "list_item",
        text,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "TR":
      return {
        role: "table_row",
        text,
        details: {
          nativeTag: role,
          cells: [],
        },
        recurseChildren: false,
      };
    case "Figure":
      return {
        role: "figure",
        text: "",
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "Formula":
      return {
        role: "formula",
        text,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "Form":
      return {
        role: "form",
        text,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    case "Artifact":
      return {
        role: "artifact",
        text,
        details: {
          nativeTag: role,
        },
        recurseChildren: false,
      };
    default:
      return null;
  }
};

const buildNativeAnalysis = (parsedOutput) => {
  const extractedTags = parsedOutput.extractedTags || { tags: [], summary: {} };
  const pages = parsedOutput.pages.map((page) => {
    const blocks = extractedTags.tags
      .filter((tag) => tag.page === page.pageIndex)
      .map((tag) => {
        const blockSpec = getNativeBlockSpec(tag);

        if (!blockSpec || (!blockSpec.text && blockSpec.role !== "figure")) {
          return null;
        }

        return buildSemanticBlock({
          id: `semantic-${tag.sourceNodeId || tag.index}`,
          pageIndex: page.pageIndex,
          sourceBlockId: tag.sourceNodeId || tag.uniqueKey,
          top: tag.top || 0,
          left: tag.left || 0,
          text: blockSpec.text,
          fontSize: tag.fontSize || 0,
          role: blockSpec.role,
          details: {
            ...blockSpec.details,
            extractedTagKey: tag.uniqueKey,
          },
        });
      })
      .filter(Boolean);

    return {
      pageIndex: page.pageIndex,
      blocks: blocks.sort((a, b) => a.top - b.top || a.left - b.left),
    };
  });

  const normalizedPages = finalizePages(pages);
  const allBlocks = normalizedPages.flatMap((page) => page.blocks);

  return {
    document: {
      pageCount: parsedOutput.document.pageCount,
      baselineFontSize: parsedOutput.document.medianFontSize || 12,
      analyzedAt: new Date().toISOString(),
      extractionMode: "native-struct-tree",
    },
    pages: normalizedPages,
    extractedTags,
    structureTree: parsedOutput.structureTree,
    summary: {
      headings: allBlocks.filter((block) => block.role === "heading").length,
      figures: allBlocks.filter((block) => block.role === "figure").length,
      listItems: allBlocks.filter((block) => block.role === "list_item").length,
      tableRows: allBlocks.filter((block) => block.role === "table_row").length,
      paragraphs: allBlocks.filter((block) => block.role === "paragraph").length,
      links: allBlocks.filter((block) => block.role === "link").length,
      codeBlocks: allBlocks.filter((block) => block.role === "code").length,
    },
  };
};

const analyzeContent = (parsedOutput) => {
  const hasAnnotationOverrides =
    Number(parsedOutput?.document?.annotationOverrideCount) > 0;

  if (parsedOutput.structureTree?.root && !hasAnnotationOverrides) {
    return buildNativeAnalysis(parsedOutput);
  }

  const baselineSize = parsedOutput.document.medianFontSize || 12;
  const pages = parsedOutput.pages.map((page) => ({
    pageIndex: page.pageIndex,
    blocks: inferSemanticBlocks(page, baselineSize),
  }));

  const normalizedPages = finalizePages(pages);
  const allBlocks = normalizedPages.flatMap((page) => page.blocks);
  const headings = allBlocks.filter((block) => block.role === "heading");
  const figures = allBlocks.filter((block) => block.role === "figure");
  const listItems = allBlocks.filter((block) => block.role === "list_item");
  const tables = allBlocks.filter((block) => block.role === "table_row");

  return {
    document: {
      pageCount: parsedOutput.document.pageCount,
      baselineFontSize: baselineSize,
      analyzedAt: new Date().toISOString(),
      extractionMode: "fallback-inference",
    },
    pages: normalizedPages,
    extractedTags: parsedOutput.extractedTags,
    summary: {
      headings: headings.length,
      figures: figures.length,
      listItems: listItems.length,
      tableRows: tables.length,
      paragraphs: allBlocks.filter((block) => block.role === "paragraph").length,
      links: allBlocks.filter((block) => block.role === "link").length,
      codeBlocks: allBlocks.filter((block) => block.role === "code").length,
    },
  };
};

module.exports = {
  analyzeContent,
};
