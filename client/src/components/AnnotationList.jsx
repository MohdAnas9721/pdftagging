import { Scissors } from "lucide-react";

import { getDisplayTag } from "../utils/tagging";

function AnnotationList({ annotations, onRemove }) {
  return (
    <aside className="panel-surface flex h-full min-h-0 flex-col overflow-hidden px-4 py-5 sm:px-5">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Audit List
          </p>
          <h2 className="font-display text-xl font-bold text-slate-950">
            Annotations
          </h2>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {annotations.length}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-3">
          {annotations.length ? (
            annotations.map((annotation) => (
              <article
                key={annotation.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/85 px-4 py-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={{
                      backgroundColor: annotation.bg,
                      color: annotation.color,
                    }}
                  >
                    {getDisplayTag(annotation)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(annotation.id)}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    aria-label="Remove annotation"
                  >
                    <Scissors className="h-4 w-4" />
                  </button>
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {annotation.text}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {annotation.start} to {annotation.end}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-sm leading-7 text-slate-600">
              Select text in the raw PDF output to start creating inline semantic
              tags. Every saved range stays tied to its original character offsets.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default AnnotationList;
