const buildTagNode = (id, type, label, meta = {}, children = []) => ({
  id,
  type,
  label,
  meta,
  children,
});

const generateTagTree = (analysisOutput) => {
  const pages = analysisOutput.pages.map((page) => {
    const children = [];
    let listBuffer = [];
    let tableBuffer = [];

    const flushList = () => {
      if (!listBuffer.length) {
        return;
      }

      const listChildren = listBuffer.map((item) =>
        buildTagNode(
          `tag-${item.id}`,
          "LI",
          item.text,
          { pageIndex: item.pageIndex, sourceBlockId: item.sourceBlockId },
          [buildTagNode(`tag-${item.id}-p`, "P", item.text)]
        )
      );

      children.push(
        buildTagNode(
          `list-${page.pageIndex}-${children.length + 1}`,
          "L",
          `List (${listBuffer.length} items)`,
          { pageIndex: page.pageIndex },
          listChildren
        )
      );

      listBuffer = [];
    };

    const flushTable = () => {
      if (!tableBuffer.length) {
        return;
      }

      const rowNodes = tableBuffer.map((row, rowIndex) =>
        buildTagNode(
          `table-row-${page.pageIndex}-${rowIndex + 1}`,
          "TR",
          `Row ${rowIndex + 1}`,
          { pageIndex: page.pageIndex },
          row.details.cells.map((cell, cellIndex) =>
            buildTagNode(
              `table-cell-${page.pageIndex}-${rowIndex + 1}-${cellIndex + 1}`,
              rowIndex === 0 ? "TH" : "TD",
              cell,
              {
                pageIndex: page.pageIndex,
                sourceBlockId: row.sourceBlockId,
              }
            )
          )
        )
      );

      children.push(
        buildTagNode(
          `table-${page.pageIndex}-${children.length + 1}`,
          "Table",
          `Table (${tableBuffer.length} rows)`,
          { pageIndex: page.pageIndex },
          rowNodes
        )
      );

      tableBuffer = [];
    };

    page.blocks.forEach((block) => {
      if (block.role !== "list_item") {
        flushList();
      }

      if (block.role !== "table_row") {
        flushTable();
      }

      if (block.role === "heading") {
        children.push(
          buildTagNode(
            `tag-${block.id}`,
            `H${block.details.level || 1}`,
            block.text,
            {
              pageIndex: block.pageIndex,
              sourceBlockId: block.sourceBlockId,
            }
          )
        );
      } else if (block.role === "paragraph") {
        children.push(
          buildTagNode(
            `tag-${block.id}`,
            "P",
            block.text,
            {
              pageIndex: block.pageIndex,
              sourceBlockId: block.sourceBlockId,
            }
          )
        );
      } else if (block.role === "list_item") {
        listBuffer.push(block);
      } else if (block.role === "table_row") {
        tableBuffer.push(block);
      } else if (block.role === "figure") {
        children.push(
          buildTagNode(
            `tag-${block.id}`,
            "Figure",
            `Figure ${block.details.imageIndex}`,
            {
              pageIndex: block.pageIndex,
              sourceBlockId: block.sourceBlockId,
              altText: "",
              decorative: false,
            }
          )
        );
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

  return {
    generatedAt: new Date().toISOString(),
    root: buildTagNode(
      "document-root",
      "Document",
      "Tagged PDF Prototype",
      {},
      pages
    ),
    summary: {
      pageCount: pages.length,
      supportedTags: [
        "H1-H6",
        "P",
        "L",
        "LI",
        "Table",
        "TR",
        "TH",
        "TD",
        "Figure",
      ],
    },
  };
};

module.exports = {
  generateTagTree,
};
