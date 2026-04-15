import { useEffect, useMemo } from "react";
import EmptyState from "../common/EmptyState";

function ParsedDataPreview({ parsed }) {
  const extractedTags = parsed?.extractedTags?.tags || [];
  const pages = parsed?.pages || [];
  const tagsByPage = useMemo(
    () =>
      pages.map((page) => ({
        pageIndex: page.pageIndex,
        tags: extractedTags.filter((tag) => tag.page === page.pageIndex),
      })),
    [extractedTags, pages]
  );

  useEffect(() => {
    console.debug("[pdf-tag-debug] parsed rendered count:", extractedTags.length);
  }, [extractedTags.length]);

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
        {tagsByPage.map((page) => (
          <div key={page.pageIndex} className="panel-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Page {page.pageIndex}</h3>
              <p className="text-sm text-slate-500">
                {page.tags.length} unique extracted tag{page.tags.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {page.tags.length ? (
                page.tags.map((tag) => (
                  <div key={tag.uniqueKey} className="rounded-xl bg-white p-3 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{tag.tagName}</p>
                      <p className="text-xs text-slate-500">
                        path:{tag.path || tag.index} bbox:{tag.bboxKey || "n/a"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {tag.text || tag.label || "No text content"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-white p-3 text-sm text-slate-500">
                  No extracted structural tags on this page.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ParsedDataPreview;
