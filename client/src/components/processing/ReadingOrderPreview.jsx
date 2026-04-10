import EmptyState from "../common/EmptyState";

function ReadingOrderPreview({ readingOrder }) {
  if (!readingOrder) {
    return (
      <EmptyState
        title="Reading order pending"
        description="Logical reading order will appear here once the sequence engine completes."
      />
    );
  }

  return (
    <div className="space-y-4">
      {readingOrder.pages.map((page) => (
        <div key={page.pageIndex} className="panel-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">Page {page.pageIndex}</h3>
            <p className="text-sm text-slate-500">
              {page.warnings.length
                ? `${page.warnings.length} warning(s)`
                : "No sequence warnings"}
            </p>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              {page.blocks.map((block) => (
                <div
                  key={block.blockId}
                  className="flex gap-3 rounded-xl bg-white p-3 text-sm"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {block.order}
                  </span>
                  <div>
                    <p className="font-medium capitalize text-slate-900">{block.role}</p>
                    <p className="mt-1 text-slate-600">
                      {block.text || "Figure / non-text block"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {page.warnings.length ? (
                page.warnings.map((warning, index) => (
                  <div key={index} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    {warning.message}
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
                  Reading order looks stable based on current heuristics.
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReadingOrderPreview;
