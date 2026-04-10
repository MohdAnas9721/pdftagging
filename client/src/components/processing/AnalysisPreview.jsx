import EmptyState from "../common/EmptyState";

function AnalysisPreview({ analysis }) {
  if (!analysis) {
    return (
      <EmptyState
        title="Semantic analysis pending"
        description="Heuristic detection for headings, paragraphs, lists, tables, and figures will appear here."
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

      {analysis.pages.map((page) => (
        <div key={page.pageIndex} className="panel-muted p-4">
          <h3 className="font-semibold text-slate-900">Page {page.pageIndex}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {page.blocks.map((block) => (
              <div key={block.id} className="rounded-xl bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {block.role}
                  </span>
                  {block.details?.level ? (
                    <span className="text-xs text-slate-400">H{block.details.level}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  {block.text || "Figure / non-text block"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AnalysisPreview;
