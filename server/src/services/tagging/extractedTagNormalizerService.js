const { normalizeTagName } = require("../../utils/tagging");

const EXCLUDED_COUNT_TAGS = new Set(["Document", "Page"]);

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .replace(/\s([,.;:!?])/g, "$1")
    .trim();

const roundMetric = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? Number(numericValue.toFixed(2))
    : null;
};

const buildMetricKey = (meta = {}) => {
  const left = roundMetric(meta.left);
  const top = roundMetric(meta.top);
  const fontSize = roundMetric(meta.fontSize);

  if ([left, top, fontSize].some((value) => value !== null)) {
    return [left ?? "na", top ?? "na", fontSize ?? "na"].join(":");
  }

  return "";
};

const createEmptyExtractedTags = (pageCount = 0, extractionMode = "fallback-inference") => ({
  tags: [],
  summary: {
    rawCount: 0,
    normalizedCount: 0,
    dedupedCount: 0,
    pageCount,
    extractionMode,
    activeTags: [],
    figureCount: 0,
  },
});

const isCountableTag = (tagName) =>
  Boolean(tagName) && !EXCLUDED_COUNT_TAGS.has(tagName);

const normalizeExtractedTags = (root) => {
  if (!root) {
    return [];
  }

  const normalizedTags = [];
  const pageTextOffsets = new Map();
  let traversalIndex = 0;

  const visitNode = (node, pageIndex = null, path = []) => {
    if (!node || typeof node !== "object" || node.type === "content") {
      return;
    }

    traversalIndex += 1;
    const nextPageIndex = node.meta?.pageIndex || pageIndex || null;
    const tagName = normalizeTagName(node.type);
    const text = normalizeWhitespace(node.meta?.text || node.label || "");
    const textStart = pageTextOffsets.get(nextPageIndex) || 0;
    const textEnd = text ? textStart + text.length : textStart;
    const metricKey = buildMetricKey(node.meta);
    const identityPath = path.join(".");
    const identitySegment = node.id || identityPath || String(traversalIndex);
    const locationKey = metricKey || `${textStart}-${textEnd}`;

    if (isCountableTag(tagName)) {
      normalizedTags.push({
        sourceNodeId: node.id || "",
        tagName,
        label: node.label || tagName,
        page: nextPageIndex,
        path: identityPath,
        index: traversalIndex,
        bboxKey: metricKey,
        textStart,
        textEnd,
        text,
        left: roundMetric(node.meta?.left),
        top: roundMetric(node.meta?.top),
        fontSize: roundMetric(node.meta?.fontSize),
        uniqueKey: [
          tagName,
          nextPageIndex || "na",
          identitySegment,
          locationKey,
        ].join("|"),
      });
    }

    if (nextPageIndex) {
      pageTextOffsets.set(nextPageIndex, textEnd);
    }

    (node.children || []).forEach((child, childIndex) =>
      visitNode(child, nextPageIndex, [...path, childIndex])
    );
  };

  visitNode(root, root.meta?.pageIndex || null, [0]);

  return normalizedTags;
};

const dedupeExtractedTags = (normalizedTags = []) => {
  const dedupedTags = [];
  const seenKeys = new Set();
  const seenNodeIds = new Set();

  normalizedTags.forEach((tag) => {
    const nodeIdentity = String(tag.sourceNodeId || "").trim();

    if (nodeIdentity && seenNodeIds.has(nodeIdentity)) {
      return;
    }

    if (seenKeys.has(tag.uniqueKey)) {
      return;
    }

    if (nodeIdentity) {
      seenNodeIds.add(nodeIdentity);
    }

    seenKeys.add(tag.uniqueKey);
    dedupedTags.push(tag);
  });

  return dedupedTags;
};

const buildExtractedTagSummary = ({
  rawCount,
  normalizedTags,
  dedupedTags,
  pageCount,
  extractionMode,
}) => ({
  rawCount,
  normalizedCount: normalizedTags.length,
  dedupedCount: dedupedTags.length,
  pageCount,
  extractionMode,
  activeTags: [...new Set(dedupedTags.map((tag) => tag.tagName))].sort(),
  figureCount: dedupedTags.filter((tag) => tag.tagName === "Figure").length,
});

const buildDedupedStructureTree = (root, dedupedTags) => {
  if (!root) {
    return null;
  }

  const allowedNodeIds = new Set(
    dedupedTags.map((tag) => String(tag.sourceNodeId || "").trim()).filter(Boolean)
  );
  const allowedUniqueKeys = new Set(dedupedTags.map((tag) => tag.uniqueKey));
  let traversalIndex = 0;
  const pageTextOffsets = new Map();

  const visitNode = (node, pageIndex = null, path = []) => {
    if (!node || typeof node !== "object" || node.type === "content") {
      return null;
    }

    traversalIndex += 1;
    const nextPageIndex = node.meta?.pageIndex || pageIndex || null;
    const tagName = normalizeTagName(node.type);
    const text = normalizeWhitespace(node.meta?.text || node.label || "");
    const textStart = pageTextOffsets.get(nextPageIndex) || 0;
    const textEnd = text ? textStart + text.length : textStart;
    const metricKey = buildMetricKey(node.meta);
    const identityPath = path.join(".");
    const identitySegment = node.id || identityPath || String(traversalIndex);
    const uniqueKey = [
      tagName,
      nextPageIndex || "na",
      identitySegment,
      metricKey || `${textStart}-${textEnd}`,
    ].join("|");

    if (nextPageIndex) {
      pageTextOffsets.set(nextPageIndex, textEnd);
    }

    if (
      isCountableTag(tagName) &&
      !allowedNodeIds.has(String(node.id || "").trim()) &&
      !allowedUniqueKeys.has(uniqueKey)
    ) {
      return null;
    }

    const children = (node.children || [])
      .map((child, childIndex) => visitNode(child, nextPageIndex, [...path, childIndex]))
      .filter(Boolean);

    return {
      ...node,
      children,
    };
  };

  return visitNode(root, root.meta?.pageIndex || null, [0]);
};

const buildExtractedTagsDataset = ({
  root,
  pageCount = 0,
  extractionMode = "fallback-inference",
}) => {
  if (!root) {
    return {
      ...createEmptyExtractedTags(pageCount, extractionMode),
      root: null,
    };
  }

  const normalizedTags = normalizeExtractedTags(root);
  const dedupedTags = dedupeExtractedTags(normalizedTags);
  const summary = buildExtractedTagSummary({
    rawCount: normalizedTags.length,
    normalizedTags,
    dedupedTags,
    pageCount,
    extractionMode,
  });

  return {
    tags: dedupedTags,
    summary,
    root: buildDedupedStructureTree(root, dedupedTags),
  };
};

module.exports = {
  buildExtractedTagsDataset,
  createEmptyExtractedTags,
  dedupeExtractedTags,
  normalizeExtractedTags,
};
