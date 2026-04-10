import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SectionCard from "../components/common/SectionCard";
import PrimaryButton from "../components/common/PrimaryButton";
import ProgressBar from "../components/common/ProgressBar";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import PipelineStepper from "../components/processing/PipelineStepper";
import LogPanel from "../components/processing/LogPanel";
import DetailTabs from "../components/processing/DetailTabs";
import ParsedDataPreview from "../components/processing/ParsedDataPreview";
import AnalysisPreview from "../components/processing/AnalysisPreview";
import TagTreePreview from "../components/processing/TagTreePreview";
import ReadingOrderPreview from "../components/processing/ReadingOrderPreview";
import AltTextEditor from "../components/processing/AltTextEditor";
import ValidationResults from "../components/processing/ValidationResults";
import useJobPolling from "../hooks/useJobPolling";
import { reprocessPdf, startPdfProcessing, updateAltText } from "../services/pdfService";

const tabs = [
  { key: "parsed", label: "Parsed Data" },
  { key: "analysis", label: "Analyzed Blocks" },
  { key: "tags", label: "Tag Tree" },
  { key: "readingOrder", label: "Reading Order" },
  { key: "altText", label: "Alt Text" },
  { key: "validation", label: "Validation" },
];

function ProcessingPage() {
  const { id } = useParams();
  const { job, loading, error, progress, refresh } = useJobPolling(id);
  const [activeTab, setActiveTab] = useState("parsed");
  const [actionPending, setActionPending] = useState("");
  const [actionError, setActionError] = useState("");

  const currentStepLabel = useMemo(
    () => job?.steps?.find((step) => step.key === job.currentStep)?.label || "Waiting to start",
    [job]
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "parsed":
        return <ParsedDataPreview parsed={job?.outputs?.parsed} />;
      case "analysis":
        return <AnalysisPreview analysis={job?.outputs?.analysis} />;
      case "tags":
        return <TagTreePreview tags={job?.outputs?.tags} />;
      case "readingOrder":
        return <ReadingOrderPreview readingOrder={job?.outputs?.readingOrder} />;
      case "altText":
        return (
          <AltTextEditor
            altText={job?.outputs?.altText}
            saving={actionPending === "altText"}
            onSave={async (figures) => {
              try {
                setActionPending("altText");
                setActionError("");
                await updateAltText(id, figures);
                await refresh();
              } catch (saveError) {
                setActionError(saveError.message);
              } finally {
                setActionPending("");
              }
            }}
          />
        );
      case "validation":
        return <ValidationResults validation={job?.outputs?.validation} />;
      default:
        return null;
    }
  };

  const handleStart = async () => {
    try {
      setActionPending("start");
      setActionError("");
      await startPdfProcessing(id);
      await refresh();
    } catch (startError) {
      setActionError(startError.message);
    } finally {
      setActionPending("");
    }
  };

  const handleReprocess = async () => {
    try {
      setActionPending("reprocess");
      setActionError("");
      await reprocessPdf(id);
      await refresh();
    } catch (startError) {
      setActionError(startError.message);
    } finally {
      setActionPending("");
    }
  };

  if (loading) {
    return (
      <EmptyState
        title="Loading job"
        description="Fetching current processing state for this uploaded PDF."
      />
    );
  }

  if (error || !job) {
    return (
      <EmptyState
        title="Job unavailable"
        description={error || "This job could not be loaded."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Processing Dashboard"
        subtitle="Track each module, inspect artifacts, and re-run the pipeline when needed."
        actions={
          <>
            <PrimaryButton
              type="button"
              variant="secondary"
              onClick={handleReprocess}
              disabled={job.state === "processing" || actionPending === "reprocess"}
            >
              {actionPending === "reprocess" ? "Re-processing..." : "Re-process"}
            </PrimaryButton>
            {job.state === "uploaded" ? (
              <PrimaryButton
                type="button"
                onClick={handleStart}
                disabled={actionPending === "start"}
              >
                {actionPending === "start" ? "Starting..." : "Start Pipeline"}
              </PrimaryButton>
            ) : null}
            {job.state === "ready" ? (
              <Link to={`/result/${job.id}`}>
                <PrimaryButton variant="accent">Open Results</PrimaryButton>
              </Link>
            ) : null}
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="panel-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Current state</p>
                  <h3 className="mt-1 font-semibold text-slate-900">
                    {job.file.originalName}
                  </h3>
                </div>
                <StatusBadge status={job.state}>{job.state}</StatusBadge>
              </div>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                  <span>{currentStepLabel}</span>
                  <span>{progress}%</span>
                </div>
                <ProgressBar value={progress} />
              </div>
              {actionError ? (
                <p className="mt-4 text-sm text-rose-600">{actionError}</p>
              ) : null}
            </div>

            <DetailTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
              {renderTabContent()}
            </DetailTabs>
          </div>

          <div className="space-y-4">
            <SectionCard title="Pipeline Steps" subtitle="One-by-one execution status">
              <PipelineStepper steps={job.steps} currentStep={job.currentStep} />
            </SectionCard>
            <SectionCard title="Processing Log" subtitle="Detailed step-by-step events">
              <LogPanel logs={job.logs} />
            </SectionCard>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default ProcessingPage;
