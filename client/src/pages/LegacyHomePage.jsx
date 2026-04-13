import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SectionCard from "../components/common/SectionCard";
import UploadDropzone from "../components/upload/UploadDropzone";
import UploadedFileCard from "../components/upload/UploadedFileCard";
import {
  getPdfStatus,
  startPdfProcessing,
  uploadPdf,
} from "../services/pdfService";
import { getLatestJobId, saveLatestJobId } from "../utils/helpers";

function LegacyHomePage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [clientError, setClientError] = useState("");
  const [serverError, setServerError] = useState("");
  const [latestJob, setLatestJob] = useState(null);
  const [loadingLatestJob, setLoadingLatestJob] = useState(true);
  const [uploadPending, setUploadPending] = useState(false);
  const [processPending, setProcessPending] = useState(false);

  useEffect(() => {
    const latestJobId = getLatestJobId();

    if (!latestJobId) {
      setLoadingLatestJob(false);
      return;
    }

    getPdfStatus(latestJobId)
      .then((data) => setLatestJob(data.job))
      .catch((error) => {
        setServerError(error.message);
        window.localStorage.removeItem("pdf-tagging-latest-job");
      })
      .finally(() => setLoadingLatestJob(false));
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      setServerError("Please select a PDF before uploading.");
      return;
    }

    try {
      setUploadPending(true);
      setServerError("");
      const data = await uploadPdf(selectedFile);
      setLatestJob(data.job);
      saveLatestJobId(data.job.id);
      setSelectedFile(null);
    } catch (error) {
      setServerError(error.message);
    } finally {
      setUploadPending(false);
    }
  };

  const handleStartProcessing = async () => {
    if (!latestJob?.id) {
      setServerError("Upload a PDF before starting processing.");
      return;
    }

    try {
      setProcessPending(true);
      setServerError("");
      await startPdfProcessing(latestJob.id);
      navigate(`/process/${latestJob.id}`);
    } catch (error) {
      setServerError(error.message);
    } finally {
      setProcessPending(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-8">
          <UploadDropzone
            error={clientError || serverError}
            onFileSelect={(file, error) => {
              setSelectedFile(file);
              setClientError(error);
              setServerError("");
            }}
          />

          <UploadedFileCard
            selectedFile={selectedFile}
            job={latestJob}
            loading={loadingLatestJob}
            uploadPending={uploadPending}
            processPending={processPending}
            onUpload={handleUpload}
            onStartProcessing={handleStartProcessing}
            error={clientError || serverError}
          />
        </div>

        <SectionCard
          title="Workflow Coverage"
          subtitle="This prototype follows the PDF tagging sequence module-by-module."
        >
          <div className="space-y-3">
            {[
              "1. PDF upload and temporary storage",
              "2. PDF parser with text and image operator extraction",
              "3. Content analyzer with rule-based semantic classification",
              "4. Tag generator with previewable tag tree JSON",
              "5. Reading order engine with heuristic sequencing",
              "6. Alt text generator with manual editing support",
              "7. Accessibility validator with report summary",
              "8. Prototype output artifacts and downloads",
            ].map((item) => (
              <div key={item} className="panel-muted px-4 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

export default LegacyHomePage;
