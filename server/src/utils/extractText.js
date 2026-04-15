const fs = require("fs/promises");

let pdfjsPromise;

const getPdfJs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }

  return pdfjsPromise;
};

const normalizePageText = (items) =>
  items
    .map((item) => String(item?.str || ""))
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();

const extractRawText = async (filePath) => {
  const pdfjsLib = await getPdfJs();
  const data = new Uint8Array(await fs.readFile(filePath));
  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    pages.push(normalizePageText(textContent.items));
  }

  return {
    pageCount: pdf.numPages,
    pageTexts: pages,
    rawText: pages.join("\n\n"),
  };
};

module.exports = {
  extractRawText,
};
