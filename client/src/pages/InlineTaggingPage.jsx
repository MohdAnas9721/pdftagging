import { Link } from "react-router-dom";
import { ArrowRight, Database, WandSparkles } from "lucide-react";
import { useState } from "react";
import UploadZone from "../components/UploadZone";
import InlineTagger from "../components/InlineTagger";

function InlineTaggingPage() {
  const [documentData, setDocumentData] = useState(null);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_340px]">
        <div className="space-y-6">
          {!documentData ? (
            <UploadZone onUploaded={setDocumentData} />
          ) : (
            <InlineTagger
              docId={documentData.docId}
              rawText={documentData.rawText}
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel-surface px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Leometric
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold text-slate-950">
              PDF inline tagging system
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Upload once, inspect raw extracted text, annotate with semantic tags,
              and generate HTML from character offsets instead of mutating the text.
            </p>
          </div>

          <div className="panel-surface px-5 py-5">
            <div className="flex items-start gap-3">
              <Database className="mt-1 h-5 w-5 text-slate-700" />
              <div>
                <h3 className="font-semibold text-slate-900">Mongo-backed state</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Uploads create a persistent `PdfDocument` entry with raw text,
                  annotations, generated HTML, and timestamps in the `leometric`
                  database.
                </p>
              </div>
            </div>
          </div>

          <div className="panel-surface px-5 py-5">
            <div className="flex items-start gap-3">
              <WandSparkles className="mt-1 h-5 w-5 text-slate-700" />
              <div>
                <h3 className="font-semibold text-slate-900">Legacy extractor kept safe</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Your earlier PDF processing pipeline is still available separately,
                  so we can use it in the next phase after this common inline-tagging
                  base is in place.
                </p>
              </div>
            </div>
            <Link
              to="/pipeline"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition hover:text-sky-700"
            >
              Open legacy pipeline
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default InlineTaggingPage;
