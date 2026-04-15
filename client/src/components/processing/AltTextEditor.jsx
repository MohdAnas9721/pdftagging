import { useEffect, useState } from "react";
import EmptyState from "../common/EmptyState";
import PrimaryButton from "../common/PrimaryButton";

function AltTextEditor({ altText, extractedTags, saving, onSave }) {
  const [figures, setFigures] = useState([]);

  useEffect(() => {
    setFigures(altText?.figures || []);
  }, [altText]);

  useEffect(() => {
    console.debug("[pdf-tag-debug] alt text rendered count:", figures.length);
  }, [figures.length, extractedTags?.summary?.figureCount]);

  if (!altText?.figures?.length) {
    return (
      <EmptyState
        title="No figures detected"
        description="If the parser finds image references, editable alt text fields will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Decorative figures can be marked to avoid false missing-alt warnings. All
        other figures should keep meaningful descriptions.
      </div>

      {figures.map((figure) => (
        <div key={figure.id} className="panel-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">
                {figure.label} - Page {figure.pageIndex}
              </p>
              <p className="text-sm text-slate-500">
                Source block: {figure.sourceBlockId}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={figure.decorative}
                onChange={(event) =>
                  setFigures((current) =>
                    current.map((item) =>
                      item.id === figure.id
                        ? { ...item, decorative: event.target.checked }
                        : item
                    )
                  )
                }
              />
              Decorative
            </label>
          </div>
          <textarea
            rows={4}
            value={figure.altText}
            onChange={(event) =>
              setFigures((current) =>
                current.map((item) =>
                  item.id === figure.id
                    ? { ...item, altText: event.target.value }
                    : item
                )
              )
            }
            disabled={figure.decorative}
            className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
          />
        </div>
      ))}

      <PrimaryButton type="button" onClick={() => onSave(figures)} disabled={saving}>
        {saving ? "Saving..." : "Save Alt Text Updates"}
      </PrimaryButton>
    </div>
  );
}

export default AltTextEditor;
