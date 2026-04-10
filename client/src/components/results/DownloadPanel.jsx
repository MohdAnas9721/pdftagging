import PrimaryButton from "../common/PrimaryButton";

function DownloadPanel({
  onDownloadTaggedPdf,
  onDownloadParsed,
  onDownloadAnalysis,
  onDownloadTags,
  onDownloadReadingOrder,
  onDownloadAltText,
  onDownloadValidation,
  summaryUrl,
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <PrimaryButton type="button" onClick={onDownloadTaggedPdf} variant="accent">
        Download Tagged PDF
      </PrimaryButton>
      <PrimaryButton type="button" onClick={onDownloadParsed} variant="secondary">
        Download Parsed JSON
      </PrimaryButton>
      <PrimaryButton type="button" onClick={onDownloadAnalysis} variant="secondary">
        Download Semantic Analysis
      </PrimaryButton>
      <PrimaryButton type="button" onClick={onDownloadTags} variant="secondary">
        Download Tag Tree JSON
      </PrimaryButton>
      <PrimaryButton type="button" onClick={onDownloadReadingOrder} variant="secondary">
        Download Reading Order
      </PrimaryButton>
      <PrimaryButton type="button" onClick={onDownloadAltText} variant="secondary">
        Download Alt Text JSON
      </PrimaryButton>
      <PrimaryButton type="button" onClick={onDownloadValidation} variant="secondary">
        Download Validation JSON
      </PrimaryButton>
      <a href={summaryUrl} target="_blank" rel="noreferrer">
        <PrimaryButton type="button" className="w-full" variant="accent">
          Download Summary Report
        </PrimaryButton>
      </a>
    </div>
  );
}

export default DownloadPanel;
