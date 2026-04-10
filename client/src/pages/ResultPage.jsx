import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SectionCard from "../components/common/SectionCard";
import PrimaryButton from "../components/common/PrimaryButton";
import EmptyState from "../components/common/EmptyState";
import ResultSummary from "../components/results/ResultSummary";
import DownloadPanel from "../components/results/DownloadPanel";
import useJobPolling from "../hooks/useJobPolling";
import {
  getArtifactDownloadUrl,
  getPdfResult,
  getReportDownloadUrl,
  reprocessPdf,
} from "../services/pdfService";
import { downloadFromUrl } from "../utils/helpers";

function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { job, loading, error, refresh } = useJobPolling(id);
  const [resultData, setResultData] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [actionPending, setActionPending] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (job?.state !== "ready") {
      setResultData(null);
      return;
    }

    setResultLoading(true);
    getPdfResult(id)
      .then((data) => {
        setResultData(data);
        setActionError("");
      })
      .catch((resultError) => setActionError(resultError.message))
      .finally(() => setResultLoading(false));
  }, [id, job?.state]);

  if (loading) {
    return (
      <EmptyState
        title="Loading result"
        description="Fetching result artifacts and validation summary for this PDF."
      />
    );
  }

  if (error || !job) {
    return (
      <EmptyState
        title="Result unavailable"
        description={error || "This job could not be loaded."}
      />
    );
  }

  if (job.state !== "ready") {
    return (
      <SectionCard title="Processing still in progress" subtitle="The result view unlocks after all pipeline steps finish.">
        <div className="flex flex-col gap-4">
          <EmptyState
            title="Result artifacts are not ready yet"
            description="Open the processing dashboard to continue reviewing the live steps, logs, and intermediate outputs."
          />
          <div>
            <Link to={`/process/${id}`}>
              <PrimaryButton>Open Processing Dashboard</PrimaryButton>
            </Link>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Result Artifacts"
        subtitle="Final structured outputs, validation summary, and downloadable reports"
        actions={
          <>
            <PrimaryButton
              type="button"
              variant="secondary"
              onClick={async () => {
                try {
                  setActionPending("reprocess");
                  setActionError("");
                  await reprocessPdf(id);
                  await refresh();
                  navigate(`/process/${id}`);
                } catch (reprocessError) {
                  setActionError(reprocessError.message);
                } finally {
                  setActionPending("");
                }
              }}
              disabled={actionPending === "reprocess"}
            >
              {actionPending === "reprocess" ? "Re-processing..." : "Re-process"}
            </PrimaryButton>
            <Link to={`/process/${id}`}>
              <PrimaryButton variant="secondary">Open Dashboard</PrimaryButton>
            </Link>
            <Link to="/">
              <PrimaryButton>Upload New PDF</PrimaryButton>
            </Link>
          </>
        }
      >
        {actionError ? (
          <p className="mb-4 text-sm text-rose-600">{actionError}</p>
        ) : null}

        {resultLoading ? (
          <EmptyState
            title="Loading processed artifacts"
            description="Fetching the final processed JSON, tag tree, and validation report from the backend."
          />
        ) : (
          <>
            <ResultSummary job={resultData?.job || job} />

            <div className="mt-6">
              <DownloadPanel
                summaryUrl={getReportDownloadUrl(id)}
                onDownloadTaggedPdf={() =>
                  downloadFromUrl(getArtifactDownloadUrl(id, "tagged-pdf"))
                }
                onDownloadParsed={() =>
                  downloadFromUrl(getArtifactDownloadUrl(id, "parsed"))
                }
                onDownloadAnalysis={() =>
                  downloadFromUrl(getArtifactDownloadUrl(id, "analysis"))
                }
                onDownloadTags={() =>
                  downloadFromUrl(getArtifactDownloadUrl(id, "tags"))
                }
                onDownloadReadingOrder={() =>
                  downloadFromUrl(getArtifactDownloadUrl(id, "reading-order"))
                }
                onDownloadAltText={() =>
                  downloadFromUrl(getArtifactDownloadUrl(id, "alt-text"))
                }
                onDownloadValidation={() =>
                  downloadFromUrl(getArtifactDownloadUrl(id, "validation"))
                }
              />
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

export default ResultPage;
