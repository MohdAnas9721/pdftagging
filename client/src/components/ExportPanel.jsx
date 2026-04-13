import { useState } from "react";
import { Code2, Download, Save } from "lucide-react";
import { exportSemanticPreviewPdf } from "../utils/exportSemanticPreviewPdf";

function ExportPanel({
  generatedHtml,
  annotationCount,
  saving,
  onSave,
  error,
  isSaved,
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError("");

    try {
      await exportSemanticPreviewPdf(generatedHtml, "semantic-preview.pdf");
    } catch (pdfError) {
      setDownloadError(pdfError.message);
    } finally {
      setDownloading(false);
    }
  };

  const panelError = downloadError || error;

  return (
    <section className="panel-surface px-5 py-5 sm:px-6">
      <div className="mb-4 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            HTML Output
          </p>
          <h2 className="font-display text-2xl font-bold text-slate-950">
            Generated semantic preview
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            HTML is derived from immutable raw text plus annotation ranges. It is
            never the primary source of truth.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex h-12 min-w-[154px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Generating PDF..." : "Download PDF"}
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-12 min-w-[138px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_20px_42px_rgba(15,23,42,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving tags..." : "Save Tags"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {annotationCount} annotations
        </span>
        <span
          className={`rounded-full px-3 py-1 ${
            isSaved
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {isSaved ? "Saved to MongoDB" : "Client-side preview"}
        </span>
      </div>

      {panelError ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {panelError}
        </div>
      ) : null}

      <div className="rounded-[28px] bg-slate-950 p-4 text-slate-100 shadow-[0_20px_55px_rgba(15,23,42,0.25)]">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <Code2 className="h-4 w-4" />
          Generated HTML
        </div>
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">
          {generatedHtml || "No HTML generated yet."}
        </pre>
      </div>
    </section>
  );
}

export default ExportPanel;
