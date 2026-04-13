const EXPORT_CONTAINER_ID = "semantic-preview-pdf-export";

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getPrintableMarkup = (html) => {
  const content = String(html || "").trim();

  if (!content) {
    return "<p>No semantic preview content available.</p>";
  }

  const template = document.createElement("template");
  template.innerHTML = content;

  const hasRenderableContent =
    template.content.textContent?.trim() ||
    template.content.querySelector(
      "img, table, figure, figcaption, blockquote, pre, code"
    );

  if (!hasRenderableContent) {
    return `<pre>${escapeHtml(content)}</pre>`;
  }

  return content;
};

const createExportContainer = (html) => {
  const existingContainer = document.getElementById(EXPORT_CONTAINER_ID);

  if (existingContainer) {
    existingContainer.remove();
  }

  const wrapper = document.createElement("div");
  wrapper.id = EXPORT_CONTAINER_ID;
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.position = "fixed";
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.maxWidth = "794px";
  wrapper.style.padding = "0";
  wrapper.style.background = "#ffffff";
  wrapper.style.opacity = "0";
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "-1";
  wrapper.style.boxSizing = "border-box";

  wrapper.innerHTML = `
    <section style="background:#ffffff;color:#0f172a;font-family:Aptos,'Segoe UI',sans-serif;padding:40px 44px;line-height:1.7;">
      <article class="semantic-preview-pdf-body">
        ${getPrintableMarkup(html)}
      </article>
    </section>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${EXPORT_CONTAINER_ID} h1,
    #${EXPORT_CONTAINER_ID} h2,
    #${EXPORT_CONTAINER_ID} h3,
    #${EXPORT_CONTAINER_ID} h4,
    #${EXPORT_CONTAINER_ID} h5,
    #${EXPORT_CONTAINER_ID} h6 {
      margin: 1.15em 0 0.45em;
      color: #0f172a;
      line-height: 1.25;
    }

    #${EXPORT_CONTAINER_ID} p,
    #${EXPORT_CONTAINER_ID} li,
    #${EXPORT_CONTAINER_ID} blockquote,
    #${EXPORT_CONTAINER_ID} figcaption,
    #${EXPORT_CONTAINER_ID} td,
    #${EXPORT_CONTAINER_ID} th {
      font-size: 14px;
      color: #1e293b;
    }

    #${EXPORT_CONTAINER_ID} p,
    #${EXPORT_CONTAINER_ID} ul,
    #${EXPORT_CONTAINER_ID} ol,
    #${EXPORT_CONTAINER_ID} pre,
    #${EXPORT_CONTAINER_ID} table,
    #${EXPORT_CONTAINER_ID} blockquote,
    #${EXPORT_CONTAINER_ID} figure {
      margin: 0 0 1em;
    }

    #${EXPORT_CONTAINER_ID} ul,
    #${EXPORT_CONTAINER_ID} ol {
      padding-left: 1.4em;
    }

    #${EXPORT_CONTAINER_ID} blockquote {
      border-left: 4px solid #cbd5e1;
      margin-left: 0;
      padding: 0.2em 0 0.2em 1em;
      color: #334155;
      background: #f8fafc;
    }

    #${EXPORT_CONTAINER_ID} code {
      font-family: 'Cascadia Code', Consolas, monospace;
      background: #e2e8f0;
      border-radius: 6px;
      padding: 0.15em 0.4em;
    }

    #${EXPORT_CONTAINER_ID} pre {
      font-family: 'Cascadia Code', Consolas, monospace;
      white-space: pre-wrap;
      word-break: break-word;
      background: #f8fafc;
      color: #0f172a;
      border-radius: 16px;
      padding: 18px;
      overflow: hidden;
    }

    #${EXPORT_CONTAINER_ID} mark {
      background: #fef08a;
      color: inherit;
      padding: 0.06em 0.2em;
      border-radius: 4px;
    }

    #${EXPORT_CONTAINER_ID} table {
      width: 100%;
      border-collapse: collapse;
    }

    #${EXPORT_CONTAINER_ID} th,
    #${EXPORT_CONTAINER_ID} td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }

    #${EXPORT_CONTAINER_ID} th {
      background: #f8fafc;
      font-weight: 700;
    }

    #${EXPORT_CONTAINER_ID} img {
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: 14px;
    }
  `;

  wrapper.appendChild(style);
  document.body.appendChild(wrapper);
  return wrapper;
};

const getReadableExportText = (html) => {
  const container = createExportContainer(html);
  const body = container.querySelector(".semantic-preview-pdf-body");
  const readableText = body?.innerText?.trim();

  if (readableText) {
    return { container, readableText };
  }

  return {
    container,
    readableText: String(html || "").trim() || "No semantic preview content available.",
  };
};

const addWrappedParagraph = (doc, text, x, y, maxWidth, lineHeight, bottomLimit) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  let cursorY = y;

  lines.forEach((line) => {
    if (cursorY > bottomLimit) {
      doc.addPage();
      cursorY = 72;
    }

    doc.text(line, x, cursorY);
    cursorY += lineHeight;
  });

  return cursorY;
};

export const exportSemanticPreviewPdf = async (
  html,
  filename = "semantic-preview.pdf"
) => {
  if (typeof document === "undefined") {
    throw new Error("PDF export is only available in the browser.");
  }

  const { container, readableText } = getReadableExportText(html);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 54;
    const topMargin = 62;
    const bottomMargin = 54;
    const contentWidth = pageWidth - marginX * 2;
    const bottomLimit = pageHeight - bottomMargin;

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("GENERATED SEMANTIC PREVIEW", marginX, topMargin);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Tagged PDF Preview", marginX, topMargin + 28);

    doc.setDrawColor(219, 227, 239);
    doc.line(marginX, topMargin + 44, pageWidth - marginX, topMargin + 44);

    let cursorY = topMargin + 74;
    const paragraphs = readableText
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);

    doc.setFont("times", "normal");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);

    paragraphs.forEach((paragraph) => {
      cursorY = addWrappedParagraph(
        doc,
        paragraph,
        marginX,
        cursorY,
        contentWidth,
        20,
        bottomLimit
      );
      cursorY += 10;
    });

    doc.save(filename);
  } catch (_error) {
    throw new Error("Unable to generate the PDF right now.");
  } finally {
    container.remove();
  }
};
