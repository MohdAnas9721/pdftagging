const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { pathToFileURL } = require("url");
const env = require("../../config/env");
const { AppError } = require("../../utils/apiResponse");
const { writeText } = require("../../utils/fileUtils");
const { buildArtifactFilename } = require("../../utils/filenameUtils");

const execFileAsync = promisify(execFile);

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const candidateBrowserPaths = [
  env.chromePath,
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].filter(Boolean);

const findBrowserBinary = async () => {
  for (const candidate of candidateBrowserPaths) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (_error) {
      // Try next candidate.
    }
  }

  throw new AppError(
    "Chrome or Edge was not found. Set CHROME_PATH in server/.env to enable tagged PDF export.",
    500
  );
};

const buildReadingOrderMap = (readingOrderOutput) => {
  const orderMap = new Map();

  (readingOrderOutput?.pages || []).forEach((page) => {
    page.blocks.forEach((block) => {
      orderMap.set(block.blockId, block.order);
    });
  });

  return orderMap;
};

const buildTitleFromAnalysis = (analysisOutput) => {
  const heading = analysisOutput.pages
    .flatMap((page) => page.blocks)
    .find((block) => block.role === "heading" && block.text);

  return heading?.text || "Tagged PDF Export";
};

const buildFigurePlaceholder = (label) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
      <rect width="800" height="420" rx="24" fill="#e2e8f0" />
      <rect x="60" y="60" width="680" height="300" rx="18" fill="#ffffff" stroke="#94a3b8" stroke-width="4" />
      <text x="400" y="208" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="#0f172a">
        ${escapeHtml(label || "Figure placeholder")}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const renderNode = (node, orderMap) => {
  const order = orderMap.get(node.meta?.sourceBlockId);
  const orderAttr = order ? ` data-reading-order="${order}"` : "";
  const label = escapeHtml(node.label || "");

  switch (node.type) {
    case "Document":
      return node.children.map((child) => renderNode(child, orderMap)).join("\n");
    case "Page":
      return `
        <section class="pdf-page" aria-label="${escapeHtml(node.label)}">
          ${node.children.map((child) => renderNode(child, orderMap)).join("\n")}
        </section>
      `;
    case "P":
      return `<p${orderAttr}>${label}</p>`;
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6":
      return `<${node.type.toLowerCase()}${orderAttr}>${label}</${node.type.toLowerCase()}>`;
    case "L":
      return `<ul${orderAttr}>${node.children
        .map((child) => renderNode(child, orderMap))
        .join("\n")}</ul>`;
    case "LI":
      return `<li${orderAttr}>${node.children?.length
        ? node.children.map((child) => renderNode(child, orderMap)).join("\n")
        : label}</li>`;
    case "Table":
      return `
        <table${orderAttr}>
          <tbody>
            ${node.children.map((child) => renderNode(child, orderMap)).join("\n")}
          </tbody>
        </table>
      `;
    case "TR":
      return `<tr${orderAttr}>${node.children
        .map((child) => renderNode(child, orderMap))
        .join("\n")}</tr>`;
    case "TH":
      return `<th scope="col"${orderAttr}>${label}</th>`;
    case "TD":
      return `<td${orderAttr}>${label}</td>`;
    case "Figure": {
      const isDecorative = Boolean(node.meta?.decorative);
      const altText = isDecorative ? "" : escapeHtml(node.meta?.altText || node.label);
      const roleAttrs = isDecorative ? ' alt="" role="presentation"' : ` alt="${altText}"`;
      const figCaption = isDecorative
        ? `<figcaption>${label}</figcaption>`
        : `<figcaption>${altText}</figcaption>`;

      return `
        <figure${orderAttr}>
          <img src="${buildFigurePlaceholder(node.label)}"${roleAttrs} />
          ${figCaption}
        </figure>
      `;
    }
    default:
      return node.children?.map((child) => renderNode(child, orderMap)).join("\n") || "";
  }
};

const buildAccessibleHtml = ({ title, tagTreeOutput, readingOrderOutput }) => {
  const orderMap = buildReadingOrderMap(readingOrderOutput);
  const bodyMarkup = renderNode(tagTreeOutput.root, orderMap);

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            margin: 0;
            color: #111827;
            background: white;
            line-height: 1.5;
          }
          main {
            padding: 24px 28px;
          }
          .doc-header {
            margin-bottom: 24px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 12px;
          }
          .pdf-page {
            page-break-after: always;
            break-after: page;
            padding-bottom: 12px;
          }
          .pdf-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #0f172a;
            margin: 18px 0 10px;
          }
          p, li, td, th, figcaption {
            font-size: 13px;
          }
          p, ul, table, figure {
            margin: 0 0 12px;
          }
          ul {
            padding-left: 22px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }
          figure {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 12px;
            background: #f8fafc;
          }
          img {
            width: 100%;
            max-height: 280px;
            object-fit: contain;
            border-radius: 12px;
            background: white;
          }
          figcaption {
            margin-top: 8px;
            color: #334155;
          }
          .doc-note {
            margin-top: 12px;
            font-size: 11px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <main>
          <header class="doc-header">
            <h1>${escapeHtml(title)}</h1>
            <p class="doc-note">
              Screen-reader oriented tagged PDF export generated from the semantic pipeline artifacts.
            </p>
          </header>
          ${bodyMarkup}
        </main>
      </body>
    </html>
  `;
};

const buildTaggedPdf = async ({
  job,
  analysisOutput,
  tagTreeOutput,
  readingOrderOutput,
}) => {
  const browserBinary = await findBrowserBinary();
  const htmlTitle = buildTitleFromAnalysis(analysisOutput);
  const htmlOutputPath = path.join(job.workspacePath, "tagged-pdf-export.html");
  const pdfFilename = buildArtifactFilename(job.file.originalName, "tagged-export", "pdf");
  const pdfOutputPath = path.join(job.workspacePath, pdfFilename);
  const browserProfilePath = path.join(job.workspacePath, "browser-profile");
  const html = buildAccessibleHtml({
    title: htmlTitle,
    tagTreeOutput,
    readingOrderOutput,
  });

  await writeText(htmlOutputPath, html);
  await fs.mkdir(browserProfilePath, { recursive: true });

  await execFileAsync(
    browserBinary,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-sync",
      "--metrics-recording-only",
      `--user-data-dir=${browserProfilePath}`,
      "--allow-file-access-from-files",
      "--print-to-pdf-no-header",
      `--print-to-pdf=${pdfOutputPath}`,
      pathToFileURL(htmlOutputPath).href,
    ],
    {
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 5,
    }
  );

  const fileStats = await fs.stat(pdfOutputPath);

  return {
    fileName: pdfFilename,
    path: pdfOutputPath,
    htmlPath: htmlOutputPath,
    size: fileStats.size,
    generatedAt: new Date().toISOString(),
    message:
      "Tagged PDF generated from semantic pipeline artifacts and ready for download.",
  };
};

module.exports = {
  buildTaggedPdf,
};
