import { classNames } from "../../utils/helpers";

const toneMap = {
  pending: "bg-slate-100 text-slate-700",
  running: "bg-amber-100 text-amber-800",
  success: "bg-emerald-100 text-emerald-800",
  error: "bg-rose-100 text-rose-800",
  warning: "bg-amber-100 text-amber-800",
  pass: "bg-emerald-100 text-emerald-800",
  uploaded: "bg-blue-100 text-blue-800",
  processing: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  "tagged-pdf-ready": "bg-emerald-100 text-emerald-800",
  "pending-tagged-pdf-build": "bg-amber-100 text-amber-800",
};

function StatusBadge({ status, children }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        toneMap[status] || "bg-slate-100 text-slate-700"
      )}
    >
      {children || status}
    </span>
  );
}

export default StatusBadge;
