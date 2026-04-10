import { Link } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import SectionCard from "../common/SectionCard";
import PrimaryButton from "../common/PrimaryButton";
import { formatBytes, formatDateTime } from "../../utils/helpers";

function UploadedFileCard({
  selectedFile,
  job,
  loading,
  onUpload,
  onStartProcessing,
  uploadPending,
  processPending,
  error,
}) {
  const hasSelectedFile = Boolean(selectedFile);
  const hasUploadedJob = Boolean(job);
  const canUpload = hasSelectedFile && !uploadPending;
  const canStartProcessing = !hasSelectedFile && job?.state === "uploaded" && !processPending;

  const getUiStatus = () => {
    if (error) {
      return { key: "error", label: "Error" };
    }

    if (uploadPending) {
      return { key: "running", label: "Uploading" };
    }

    if (selectedFile) {
      return { key: "pending", label: "PDF selected" };
    }

    if (processPending || job?.state === "processing") {
      return { key: "processing", label: "Processing" };
    }

    if (job?.state === "ready") {
      return { key: "ready", label: "Completed" };
    }

    if (job?.state === "uploaded") {
      return { key: "uploaded", label: "Upload complete" };
    }

    return { key: "pending", label: "No PDF selected" };
  };

  const uiStatus = getUiStatus();
  const displayFileName = selectedFile?.name || job?.file?.originalName || "No file selected";
  const displayFileSize = selectedFile?.size || job?.file?.size || 0;
  const statusSteps = [
    "No PDF selected",
    "PDF selected",
    "Uploading",
    "Upload complete",
    "Processing",
    "Completed",
    "Error",
  ];

  return (
    <SectionCard
      title="Current PDF"
      subtitle="Review the selected file, upload it, then start the processing pipeline."
      actions={
        <>
          <PrimaryButton
            type="button"
            onClick={onUpload}
            disabled={!canUpload}
            variant="secondary"
          >
            {uploadPending ? "Uploading..." : "Upload"}
          </PrimaryButton>
          <PrimaryButton
            type="button"
            onClick={onStartProcessing}
            disabled={!canStartProcessing}
          >
            {processPending
              ? "Starting..."
              : job?.state === "processing"
                ? "Processing..."
                : job?.state === "ready"
                  ? "Completed"
                  : "Start Processing"}
          </PrimaryButton>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading latest job...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Current status</p>
                <p className="mt-1 font-semibold text-slate-900">{uiStatus.label}</p>
              </div>
              <StatusBadge status={uiStatus.key}>{uiStatus.label}</StatusBadge>
            </div>

            <div className="mt-4 space-y-2">
              <div>
                <p className="text-sm text-slate-500">File</p>
                <p className="mt-1 font-semibold text-slate-900">{displayFileName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {displayFileSize ? formatBytes(displayFileSize) : "Waiting for selection"}
                </p>
              </div>

              {job?.createdAt ? (
                <p className="text-sm text-slate-500">
                  Uploaded: {formatDateTime(job.createdAt)}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Choose a PDF above, then use Upload here.
                </p>
              )}
            </div>

            {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          </div>

          <div className="panel-muted p-4">
            <div>
              <p className="text-sm text-slate-500">Status progression</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {statusSteps.map((step) => (
                  <span
                    key={step}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      step === uiStatus.label
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-500"
                    }`}
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
            {hasUploadedJob && !hasSelectedFile ? (
              <>
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Job id</p>
                  <p className="mt-1 break-all font-semibold text-slate-900">{job.id}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to={`/process/${job.id}`}>
                    <PrimaryButton variant="secondary">Open Dashboard</PrimaryButton>
                  </Link>
                  {job.state === "ready" ? (
                    <Link to={`/result/${job.id}`}>
                      <PrimaryButton variant="accent">Open Results</PrimaryButton>
                    </Link>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                {hasSelectedFile
                  ? "Upload this selected PDF to create a new processing job. Start Processing unlocks after upload completes."
                  : "Upload will create a processing job id here. Start Processing unlocks after successful upload."}
              </p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default UploadedFileCard;
