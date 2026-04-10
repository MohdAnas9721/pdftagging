import EmptyState from "../common/EmptyState";

function ParsedDataPreview({ parsed }) {
  if (!parsed) {
    return (
      <EmptyState
        title="Parser output pending"
        description="Once the parser completes, extracted page blocks and metadata will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel-muted p-4">
          <p className="text-sm text-slate-500">Pages</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {parsed.document.pageCount}
          </p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-sm text-slate-500">Detected images</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {parsed.document.totalImages}
          </p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-sm text-slate-500">Median font size</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {parsed.document.medianFontSize || "N/A"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {parsed.pages.map((page) => (
          <div key={page.pageIndex} className="panel-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Page {page.pageIndex}</h3>
              <p className="text-sm text-slate-500">
                {page.metadata.textBlockCount} text blocks, {page.metadata.imageBlockCount} image references
              </p>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Text blocks
                </p>
                <div className="mt-2 space-y-2">
                  {page.textBlocks.slice(0, 6).map((block) => (
                    <div key={block.id} className="rounded-xl bg-white p-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{block.text || "[empty]"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        x:{block.left} y:{block.top} size:{block.fontSize}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Image references
                </p>
                <div className="mt-2 space-y-2">
                  {page.imageBlocks.length ? (
                    page.imageBlocks.map((image) => (
                      <div key={image.id} className="rounded-xl bg-white p-3 text-sm text-slate-700">
                        <p className="font-medium text-slate-900">Image #{image.imageIndex}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          inferred position x:{image.left} y:{image.top}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl bg-white p-3 text-sm text-slate-500">
                      No image operators detected on this page.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ParsedDataPreview;
