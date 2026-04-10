import SectionCard from "../common/SectionCard";
import StatusBadge from "../common/StatusBadge";
import { formatBytes } from "../../utils/helpers";

function ResultSummary({ job }) {
  const report = job?.outputs?.report;
  const validation = job?.outputs?.validation;
  const outputStatus = job?.outputs?.outputStatus;
  const parsed = job?.outputs?.parsed;
  const analysis = job?.outputs?.analysis;
  const readingOrder = job?.outputs?.readingOrder;
  const fileName = job?.file?.originalName || "Unknown PDF";
  const taggedPdf = job?.outputs?.taggedPdf;

  const derivedPages = parsed?.document?.pageCount ?? report?.stats?.pages ?? 0;
  const derivedSemanticBlocks =
    analysis?.pages?.reduce((sum, page) => sum + page.blocks.length, 0) ??
    report?.stats?.semanticBlocks ??
    0;
  const derivedTagNodes = report?.stats?.tagNodes ?? 0;
  const derivedReadingOrderWarnings =
    readingOrder?.summary?.totalWarnings ?? report?.stats?.readingOrderWarnings ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <SectionCard
        title="Validation Summary"
        subtitle="Latest validator output after PDF tagging workflow completion"
      >
        <div className="mb-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Source PDF</p>
          <p className="mt-1 font-semibold text-slate-900">{fileName}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel-muted p-4">
            <p className="text-sm text-slate-500">Errors</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {validation?.summary?.errors ?? 0}
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-sm text-slate-500">Warnings</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {validation?.summary?.warnings ?? 0}
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-sm text-slate-500">Passes</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {validation?.summary?.passes ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Report snapshot</p>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap text-sm text-slate-700">
            {report?.summaryText || "Summary report not available yet."}
          </pre>
        </div>
      </SectionCard>

      <SectionCard
        title="Output Status"
        subtitle="Honest prototype output state for future PDF tag write-back"
      >
        <div className="rounded-2xl bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">Tagged PDF builder</p>
            <StatusBadge status="warning">
              {outputStatus?.status || "pending"}
            </StatusBadge>
          </div>
          <p className="mt-3 text-sm text-slate-700">
            {outputStatus?.message ||
              "Prototype output status will appear once the pipeline completes."}
          </p>
          {taggedPdf ? (
            <p className="mt-2 text-sm text-slate-600">
              Export file: {taggedPdf.fileName}
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="panel-muted p-4">
            <p className="text-sm text-slate-500">Pages</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {derivedPages}
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-sm text-slate-500">Semantic blocks</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {derivedSemanticBlocks}
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-sm text-slate-500">Tag nodes</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {derivedTagNodes}
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-sm text-slate-500">Reading order warnings</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {derivedReadingOrderWarnings}
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-sm text-slate-500">Tagged PDF size</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatBytes(report?.stats?.taggedPdfSize ?? 0)}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default ResultSummary;
