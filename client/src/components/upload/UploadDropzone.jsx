import { useRef, useState } from "react";
import PrimaryButton from "../common/PrimaryButton";
import { classNames } from "../../utils/helpers";

const MAX_FILE_SIZE_MB =
  Number(import.meta.env.VITE_MAX_FILE_SIZE_MB || 15);

function UploadDropzone({ onFileSelect, error }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptFile = (incomingFile) => {
    if (!incomingFile) {
      return;
    }

    const isPdf =
      incomingFile.type === "application/pdf" ||
      incomingFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      onFileSelect(null, "Only PDF files are allowed.");
      return;
    }

    if (incomingFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      onFileSelect(
        null,
        `PDF must be smaller than ${MAX_FILE_SIZE_MB} MB.`
      );
      return;
    }

    onFileSelect(incomingFile, "");
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        acceptFile(event.dataTransfer.files?.[0]);
      }}
      className={classNames(
        "rounded-[2rem] border-2 border-dashed px-6 py-12 text-center transition",
        isDragging
          ? "border-teal-600 bg-teal-50"
          : "border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.08),_transparent_35%),_#fff]",
        error ? "border-rose-300 bg-rose-50" : ""
      )}
    >
      <div className="mx-auto max-w-2xl">
        <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          PDF Only
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold text-slate-900">
          Upload an untagged PDF and run the tagging pipeline
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The app stores the PDF temporarily, extracts text and image references,
          generates semantic tags, proposes reading order and alt text, then
          produces validation artifacts for review.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton
            type="button"
            onClick={() => inputRef.current?.click()}
            variant="accent"
          >
            Choose PDF
          </PrimaryButton>
          <span className="text-sm text-slate-500">
            or drag and drop a file here
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />

        <div className="mt-8 rounded-2xl bg-slate-50 px-4 py-4 text-left">
          <p className="text-sm text-slate-500">
            Accepted format: PDF. Recommended maximum size: {MAX_FILE_SIZE_MB} MB.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Selected file details and action buttons appear in the Current PDF card below.
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}

export default UploadDropzone;
