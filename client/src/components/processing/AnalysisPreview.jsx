import { useEffect } from "react";
import EmptyState from "../common/EmptyState";
import { getDisplayTag } from "../../utils/tagging";

const getBlockTagMeta = (block) => {
  const tag = getDisplayTag(block);

  if (/^H[1-6]$/.test(tag)) {
    return {
      label: "HEADING",
      subtype: tag,
    };
  }

  if (tag === "P") {
    return {
      label: "PARAGRAPH",
      subtype: "P",
    };
  }

  if (tag === "LI") {
    return {
      label: "LIST",
      subtype: "LI",
    };
  }

  if (tag === "TR") {
    return {
      label: "TABLE",
      subtype: "TR",
    };
  }

  if (tag === "Figure") {
    return {
      label: "FIGURE",
      subtype: null,
    };
  }

  if (tag === "Link") {
    return {
      label: "LINK",
      subtype: null,
    };
  }

  switch (block.role) {
    default:
      return {
        label: String(tag || block.role || "BLOCK")
          .replace(/_/g, " ")
          .toUpperCase(),
        subtype: tag && tag !== block.role ? tag : null,
      };
  }
};

const getBlockPreview = (block) => {
  if (block.text?.trim()) {
    return block.text.trim();
  }

  if (block.role === "figure") {
    return `Figure ${block.details?.imageIndex || ""}`.trim();
  }

  if (block.role === "table_row" && block.details?.cells?.length) {
    return block.details.cells.join(" | ");
  }

  return "No content preview available.";
};

function AnalysisPreview({ analysis, extractedTags }) {
  const renderedCount = analysis?.pages?.reduce(
    (sum, page) => sum + page.blocks.filter((block) => block.role !== "empty").length,
    0
  ) || 0;

  useEffect(() => {
    console.debug("[pdf-tag-debug] analysis rendered count:", renderedCount);
  }, [renderedCount, extractedTags?.summary?.dedupedCount]);

  if (!analysis) {
    return (
      <EmptyState
        title="Semantic analysis pending"
        description="Detected blocks will appear here after analysis completes."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Headings", analysis.summary.headings],
          ["Paragraphs", analysis.summary.paragraphs],
          ["Lists", analysis.summary.listItems],
          ["Tables", analysis.summary.tableRows],
          ["Figures", analysis.summary.figures],
        ].map(([label, value]) => (
          <div key={label} className="panel-muted p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {analysis.pages.map((page) => (
          <div key={page.pageIndex} className="panel-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Page {page.pageIndex}</h3>
              <p className="text-sm text-slate-500">
                {page.blocks.filter((block) => block.role !== "empty").length} detected blocks
              </p>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {page.blocks
                .filter((block) => block.role !== "empty")
                .map((block) => {
                  const { label, subtype } = getBlockTagMeta(block);

                  return (
                    <div key={block.id} className="rounded-xl bg-white p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-white">
                          {label}
                        </span>
                        {subtype ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {subtype}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {getBlockPreview(block)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnalysisPreview;
