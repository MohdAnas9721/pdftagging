import StatusBadge from "../common/StatusBadge";
import { classNames, formatDateTime } from "../../utils/helpers";

function PipelineStepper({ steps = [], currentStep }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div
          key={step.key}
          className={classNames(
            "rounded-2xl border p-4 transition",
            currentStep === step.key
              ? "border-teal-600 bg-teal-50"
              : "border-slate-200 bg-white"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{step.label}</h3>
                <StatusBadge status={step.status}>{step.status}</StatusBadge>
              </div>
              <p className="mt-2 text-sm text-slate-600">{step.message}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Started: {formatDateTime(step.startedAt)}</span>
                <span>Completed: {formatDateTime(step.completedAt)}</span>
              </div>
              {step.error ? (
                <p className="mt-2 text-sm text-rose-600">{step.error}</p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PipelineStepper;
