import { useRef, useState } from "react";
import { FileText, LoaderCircle, UploadCloud } from "lucide-react";
import { uploadInlinePdf } from "../services/inlineTaggerService";
import { saveLatestJobId } from "../utils/helpers";

function UploadZone({ onUploaded }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const handleFile = async (file) => {
    if (!file) {
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Only PDF files are supported in the Leometric workspace.");
      return;
    }

    setSelectedFileName(file.name);
    setError("");
    setUploading(true);

    try {
      const data = await uploadInlinePdf(file);
      if (data?.jobId) {
        saveLatestJobId(data.jobId);
      }
      onUploaded(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="panel-surface relative overflow-hidden px-6 py-6 sm:px-8 sm:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(28,88,129,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(164,62,90,0.12),transparent_32%)]" />
      <div className="relative space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Leometric Upload
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">
            Upload any untagged PDF and start inline semantic tagging.
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Financial reports, legal notices, news articles, scanned papers, and
            other PDFs flow into immutable raw text first. Tagging happens on top
            of character offsets, so the source text stays untouched.
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFile(event.dataTransfer.files?.[0]);
          }}
          className={`group w-full rounded-[32px] border-2 border-dashed px-6 py-12 text-left transition ${
            isDragging
              ? "border-sky-500 bg-sky-50/90 shadow-lg"
              : "border-slate-300 bg-white/80 hover:border-slate-400 hover:bg-white"
          }`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-lg">
                {uploading ? (
                  <LoaderCircle className="h-7 w-7 animate-spin" />
                ) : (
                  <UploadCloud className="h-7 w-7" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-slate-900">
                  Drag and drop a PDF here
                </p>
                <p className="text-sm text-slate-600">
                  Or click to browse and upload via multipart form-data to
                  <span className="ml-1 font-medium text-slate-900">
                    POST /api/upload
                  </span>
                </p>
                {selectedFileName ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    <FileText className="h-4 w-4" />
                    {selectedFileName}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition group-hover:bg-slate-800">
              {uploading ? "Extracting raw text..." : "Choose PDF"}
            </div>
          </div>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default UploadZone;
