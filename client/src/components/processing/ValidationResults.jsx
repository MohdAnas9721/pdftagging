import { useEffect } from "react";
import EmptyState from "../common/EmptyState";
import StatusBadge from "../common/StatusBadge";

function ValidationResults({ validation, extractedTags }) {
  const renderedCount = validation?.checks?.length || 0;

  useEffect(() => {
    console.debug("[pdf-tag-debug] validation rendered count:", renderedCount);
  }, [renderedCount, extractedTags?.summary?.dedupedCount]);

  if (!validation) {
    return (
      <EmptyState
        title="Validation pending"
        description="Accessibility checks and warnings will appear after the validator finishes."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Errors", validation.summary.errors],
          ["Warnings", validation.summary.warnings],
          ["Passes", validation.summary.passes],
          ["Pages", validation.summary.pages],
        ].map(([label, value]) => (
          <div key={label} className="panel-muted p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {validation.checks.map((check) => (
          <div key={check.id} className="panel-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{check.title}</p>
                <p className="mt-1 text-sm text-slate-600">{check.message}</p>
              </div>
              <StatusBadge status={check.severity}>{check.severity}</StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ValidationResults;
