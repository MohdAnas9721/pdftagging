const SUPPORTED_TAGS = [
  "Document",
  "Page",
  "Part",
  "Art",
  "Sect",
  "Div",
  "BlockQuote",
  "Caption",
  "TOC",
  "TOCI",
  "Index",
  "NonStruct",
  "Private",
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "L",
  "LI",
  "Lbl",
  "LBody",
  "Table",
  "TR",
  "TH",
  "TD",
  "THead",
  "TBody",
  "TFoot",
  "Span",
  "Quote",
  "Note",
  "Reference",
  "BibEntry",
  "Code",
  "Link",
  "Annot",
  "Figure",
  "Formula",
  "Form",
  "Artifact",
  "header",
  "main",
  "section",
  "article",
  "nav",
  "aside",
  "footer",
  "title",
  "subtitle",
  "strong",
  "em",
  "mark",
  "small",
  "sub",
  "sup",
  "ul",
  "ol",
  "dl",
  "dt",
  "dd",
  "pre",
  "hr",
  "br",
];

const { resolveBlockTag } = require("../../utils/tagging");

const buildTagNode = (id, type, label, meta = {}, children = []) => ({
  id,
  type,
  label,
  meta,
  children,
});

const countNodes = (node) =>
  1 + (node.children || []).reduce((sum, child) => sum + countNodes(child), 0);

const collectActiveTagTypes = (node, tagSet = new Set()) => {
  tagSet.add(node.type);
  (node.children || []).forEach((child) => collectActiveTagTypes(child, tagSet));
  return tagSet;
};

const summarizeTagTree = (root, extractionMode, pageCount, extractedTagsSummary = null) => {
  const activeTagSet = extractedTagsSummary?.activeTags?.length
    ? new Set(extractedTagsSummary.activeTags)
    : collectActiveTagTypes(root);
  const uniqueNodeCount =
    extractedTagsSummary?.dedupedCount ?? Math.max(countNodes(root) - 1, 0);

  return {
    pageCount,
    supportedTags: SUPPORTED_TAGS,
    supportedTagCount: SUPPORTED_TAGS.length,
    activeTags: [...activeTagSet].sort(),
    activeTagCount: activeTagSet.size,
    nodeCount: uniqueNodeCount,
    extractionMode,
    rawCount: extractedTagsSummary?.rawCount ?? uniqueNodeCount,
    normalizedCount: extractedTagsSummary?.normalizedCount ?? uniqueNodeCount,
    uniqueExtractedTagCount: uniqueNodeCount,
  };
};

const buildInlineChildNode = (block, inlineNode, index) => {
  if (inlineNode.kind === "break") {
    return buildTagNode(
      `tag-${block.id}-inline-${index + 1}`,
      "br",
      "Line break",
      {
        pageIndex: block.pageIndex,
        sourceBlockId: block.sourceBlockId,
        inline: true,
      }
    );
  }

  const wrapperTypes = [...(inlineNode.tags || [])];

  if (!wrapperTypes.length) {
    return null;
  }

  const baseMeta = {
    pageIndex: block.pageIndex,
    sourceBlockId: block.sourceBlockId,
    inline: true,
    ...(inlineNode.href ? { href: inlineNode.href } : {}),
    ...(inlineNode.fontSize ? { fontSize: inlineNode.fontSize } : {}),
  };

  let node = buildTagNode(
    `tag-${block.id}-inline-${index + 1}-${wrapperTypes[wrapperTypes.length - 1]}`,
    wrapperTypes.pop(),
    inlineNode.text,
    baseMeta
  );

  while (wrapperTypes.length) {
    const wrapperType = wrapperTypes.pop();
    node = buildTagNode(
      `tag-${block.id}-inline-${index + 1}-${wrapperType}`,
      wrapperType,
      inlineNode.text,
      baseMeta,
      [node]
    );
  }

  return node;
};

const buildInlineChildren = (block) =>
  (block.details?.inlineNodes || [])
    .map((inlineNode, index) => buildInlineChildNode(block, inlineNode, index))
    .filter(Boolean);

const buildFallbackLeafNode = (block, explicitType) => {
  const resolvedTag = resolveBlockTag(block);
  const tagType = explicitType || resolvedTag.tag;

  return buildTagNode(
    `tag-${block.id}`,
    tagType,
    block.text,
    {
      pageIndex: block.pageIndex,
      sourceBlockId: block.sourceBlockId,
      tag: tagType,
      tagSource: block.tagSource || resolvedTag.source,
    },
    buildInlineChildren(block)
  );
};

const buildFallbackListNode = (pageIndex, sequence, listItems) => {
  const listType = listItems.every((item) => item.details?.listType === "ol")
    ? "ol"
    : "ul";

  const children = listItems.map((item, itemIndex) =>
    buildTagNode(
      `tag-${item.id}`,
      "LI",
      item.text,
      {
        pageIndex: item.pageIndex,
        sourceBlockId: item.sourceBlockId,
      },
      [
        ...(item.details?.marker
          ? [
              buildTagNode(
                `tag-${item.id}-label`,
                "Lbl",
                item.details.marker,
                {
                  pageIndex: item.pageIndex,
                  sourceBlockId: item.sourceBlockId,
                }
              ),
            ]
          : []),
        buildTagNode(
          `tag-${item.id}-body`,
          "LBody",
          item.text,
          {
            pageIndex: item.pageIndex,
            sourceBlockId: item.sourceBlockId,
          },
          [
            buildTagNode(
              `tag-${item.id}-body-text`,
              "P",
              item.text,
              {
                pageIndex: item.pageIndex,
                sourceBlockId: item.sourceBlockId,
              }
            ),
          ]
        ),
      ]
    )
  );

  return buildTagNode(
    `list-${pageIndex}-${sequence}`,
    "L",
    `${listType === "ol" ? "Ordered" : "Unordered"} list (${listItems.length} items)`,
    {
      pageIndex,
      htmlTag: listType,
    },
    children
  );
};

const buildFallbackTableNode = (pageIndex, sequence, rows) => {
  const headerCells = rows[0]?.details?.cells || [];
  const bodyRows = rows.slice(1);

  const headerNode = headerCells.length
    ? buildTagNode(
        `table-head-${pageIndex}-${sequence}`,
        "THead",
        "Table head",
        { pageIndex },
        [
          buildTagNode(
            `table-head-row-${pageIndex}-${sequence}`,
            "TR",
            "Header row",
            { pageIndex },
            headerCells.map((cell, cellIndex) =>
              buildTagNode(
                `table-head-cell-${pageIndex}-${sequence}-${cellIndex + 1}`,
                "TH",
                cell,
                { pageIndex, sourceBlockId: rows[0].sourceBlockId }
              )
            )
          ),
        ]
      )
    : null;

  const bodyNode = bodyRows.length
    ? buildTagNode(
        `table-body-${pageIndex}-${sequence}`,
        "TBody",
        "Table body",
        { pageIndex },
        bodyRows.map((row, rowIndex) =>
          buildTagNode(
            `table-row-${pageIndex}-${sequence}-${rowIndex + 1}`,
            "TR",
            `Row ${rowIndex + 1}`,
            { pageIndex, sourceBlockId: row.sourceBlockId },
            (row.details?.cells || []).map((cell, cellIndex) =>
              buildTagNode(
                `table-cell-${pageIndex}-${sequence}-${rowIndex + 1}-${cellIndex + 1}`,
                "TD",
                cell,
                { pageIndex, sourceBlockId: row.sourceBlockId }
              )
            )
          )
        )
      )
    : null;

  return buildTagNode(
    `table-${pageIndex}-${sequence}`,
    "Table",
    `Table (${rows.length} rows)`,
    { pageIndex },
    [headerNode, bodyNode].filter(Boolean)
  );
};

const buildFallbackTagTree = (analysisOutput) => {
  const pages = analysisOutput.pages.map((page) => {
    const children = [];
    let listBuffer = [];
    let tableBuffer = [];
    let sequence = 1;

    const flushList = () => {
      if (!listBuffer.length) {
        return;
      }

      children.push(buildFallbackListNode(page.pageIndex, sequence, listBuffer));
      sequence += 1;
      listBuffer = [];
    };

    const flushTable = () => {
      if (!tableBuffer.length) {
        return;
      }

      children.push(buildFallbackTableNode(page.pageIndex, sequence, tableBuffer));
      sequence += 1;
      tableBuffer = [];
    };

    page.blocks.forEach((block) => {
      if (block.role !== "list_item") {
        flushList();
      }

      if (block.role !== "table_row") {
        flushTable();
      }

      if (block.role === "list_item") {
        listBuffer.push(block);
        return;
      }

      if (block.role === "table_row") {
        tableBuffer.push(block);
        return;
      }

      const resolvedTag = resolveBlockTag(block);

      if (block.role === "heading") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "paragraph") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "link") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "code") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "quote") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "note") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "reference") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "formula") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "form") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "artifact") {
        children.push(buildFallbackLeafNode(block, resolvedTag.tag));
        sequence += 1;
        return;
      }

      if (block.role === "figure") {
        children.push(
          buildTagNode(
            `tag-${block.id}`,
            "Figure",
            block.text || `Figure ${block.details.imageIndex || sequence}`,
            {
              pageIndex: block.pageIndex,
              sourceBlockId: block.sourceBlockId,
              altText: "",
              decorative: false,
            }
          )
        );
        sequence += 1;
      }
    });

    flushList();
    flushTable();

    return buildTagNode(
      `page-${page.pageIndex}`,
      "Page",
      `Page ${page.pageIndex}`,
      { pageIndex: page.pageIndex },
      children
    );
  });

  const root = buildTagNode("document-root", "Document", "Document", {}, pages);

  return {
    generatedAt: new Date().toISOString(),
    root,
    summary: summarizeTagTree(
      root,
      analysisOutput.document?.extractionMode || "fallback-inference",
      pages.length,
      analysisOutput.extractedTags?.summary || null
    ),
    extractedTags: analysisOutput.extractedTags,
  };
};

const generateTagTree = (analysisOutput) => {
  if (analysisOutput.structureTree?.root) {
    const tagTreeOutput = {
      generatedAt: new Date().toISOString(),
      root: analysisOutput.structureTree.root,
      summary: summarizeTagTree(
        analysisOutput.structureTree.root,
        analysisOutput.document?.extractionMode || "native-struct-tree",
        analysisOutput.structureTree.root.children?.length || 0,
        analysisOutput.extractedTags?.summary || null
      ),
      extractedTags: analysisOutput.extractedTags,
    };

    return tagTreeOutput;
  }

  const fallbackTagTree = buildFallbackTagTree(analysisOutput);

  return fallbackTagTree;
};

module.exports = {
  generateTagTree,
  SUPPORTED_TAGS,
};
