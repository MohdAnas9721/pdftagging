const SUPPORTED_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "p",
  "a",
  "strong",
  "time",
  "span",
  "small",
  "del",
]);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const sanitizeAnnotations = (rawAnnotations, textLength) =>
  (Array.isArray(rawAnnotations) ? rawAnnotations : [])
    .map((annotation, index) => ({
      key: String(
        annotation?.id ||
          `${annotation?.start}-${annotation?.end}-${annotation?.tag}-${index}`
      ),
      start: Number(annotation?.start),
      end: Number(annotation?.end),
      text: String(annotation?.text || ""),
      tag: String(annotation?.tag || "").toLowerCase(),
      order: index,
    }))
    .filter(
      (annotation) =>
        Number.isFinite(annotation.start) &&
        Number.isFinite(annotation.end) &&
        annotation.start >= 0 &&
        annotation.end > annotation.start &&
        annotation.start < textLength &&
        SUPPORTED_TAGS.has(annotation.tag)
    )
    .map((annotation) => ({
      ...annotation,
      end: Math.min(annotation.end, textLength),
    }))
    .sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }

      if (left.end !== right.end) {
        return right.end - left.end;
      }

      return left.order - right.order;
    });

const wrapText = (text, annotations) => {
  if (!annotations.length) {
    return escapeHtml(text);
  }

  const sortedAnnotations = [...annotations].sort((left, right) => {
    const leftLength = left.end - left.start;
    const rightLength = right.end - right.start;

    if (leftLength !== rightLength) {
      return rightLength - leftLength;
    }

    if (left.start !== right.start) {
      return left.start - right.start;
    }

    return left.order - right.order;
  });

  let wrapped = escapeHtml(text);

  for (let index = sortedAnnotations.length - 1; index >= 0; index -= 1) {
    const annotation = sortedAnnotations[index];
    wrapped = `<${annotation.tag} data-tag="${annotation.tag}">${wrapped}</${annotation.tag}>`;
  }

  return wrapped;
};

const buildHtmlFromAnnotations = (rawText, annotations) => {
  const sourceText = String(rawText || "");

  if (!sourceText.length) {
    return "";
  }

  const normalizedAnnotations = sanitizeAnnotations(annotations, sourceText.length);
  const charTags = Array.from({ length: sourceText.length }, () => []);

  normalizedAnnotations.forEach((annotation) => {
    for (let index = annotation.start; index < annotation.end; index += 1) {
      charTags[index].push(annotation);
    }
  });

  let cursor = 0;
  let html = "";

  while (cursor < sourceText.length) {
    const activeAnnotations = charTags[cursor];
    const signature = activeAnnotations.map((annotation) => annotation.key).join(",");
    let nextCursor = cursor + 1;

    while (nextCursor < sourceText.length) {
      const nextSignature = charTags[nextCursor]
        .map((annotation) => annotation.key)
        .join(",");

      if (nextSignature !== signature) {
        break;
      }

      nextCursor += 1;
    }

    html += wrapText(sourceText.slice(cursor, nextCursor), activeAnnotations);
    cursor = nextCursor;
  }

  return html;
};

module.exports = {
  SUPPORTED_TAGS,
  buildHtmlFromAnnotations,
  escapeHtml,
};
