export const TAGS = [
  { value: "h1", label: "Heading 1", bg: "#EEEDFE", color: "#3C3489" },
  { value: "h2", label: "Heading 2", bg: "#E6F1FB", color: "#0C447C" },
  { value: "h3", label: "Heading 3", bg: "#DCEEFF", color: "#185FA5" },
  { value: "h4", label: "Heading 4", bg: "#DBF4FF", color: "#0E7490" },
  { value: "h5", label: "Heading 5", bg: "#E0F2FE", color: "#0369A1" },
  { value: "h6", label: "Heading 6", bg: "#ECFEFF", color: "#155E75" },
  { value: "p", label: "Paragraph", bg: "#F1EFE8", color: "#444441" },
  { value: "a", label: "Link or URL", bg: "#E1F5EE", color: "#085041" },
  { value: "strong", label: "Bold", bg: "#FAEEDA", color: "#633806" },
  { value: "em", label: "Emphasis", bg: "#FFF3E6", color: "#9A3412" },
  { value: "time", label: "Date", bg: "#FAECE7", color: "#712B13" },
  { value: "span", label: "Highlight", bg: "#FBEAF0", color: "#72243E" },
  { value: "del", label: "Ignore", bg: "#FCEBEB", color: "#A32D2D" },
  { value: "ul", label: "Unordered List", bg: "#EAFBF2", color: "#166534" },
  { value: "ol", label: "Ordered List", bg: "#E6FFFB", color: "#0F766E" },
  { value: "li", label: "List Item", bg: "#ECFDF5", color: "#047857" },
  { value: "blockquote", label: "Blockquote", bg: "#F3E8FF", color: "#7E22CE" },
  { value: "code", label: "Inline Code", bg: "#E5E7EB", color: "#1F2937" },
  { value: "pre", label: "Preformatted", bg: "#E2E8F0", color: "#334155" },
  { value: "img", label: "Image", bg: "#FEF3C7", color: "#92400E" },
  { value: "figure", label: "Figure", bg: "#FEF9C3", color: "#854D0E" },
  { value: "figcaption", label: "Figure Caption", bg: "#FFFBEB", color: "#A16207" },
  { value: "table", label: "Table", bg: "#E0F2FE", color: "#075985" },
  { value: "thead", label: "Table Head", bg: "#F0F9FF", color: "#0369A1" },
  { value: "tbody", label: "Table Body", bg: "#F8FAFC", color: "#475569" },
  { value: "tr", label: "Table Row", bg: "#F1F5F9", color: "#334155" },
  { value: "th", label: "Header Cell", bg: "#DBEAFE", color: "#1D4ED8" },
  { value: "td", label: "Data Cell", bg: "#EFF6FF", color: "#2563EB" },
  { value: "section", label: "Section", bg: "#F0FDF4", color: "#15803D" },
  { value: "article", label: "Article", bg: "#ECFCCB", color: "#4D7C0F" },
  { value: "header", label: "Header", bg: "#E0F7FA", color: "#0F766E" },
  { value: "footer", label: "Footer", bg: "#F1F5F9", color: "#475569" },
  { value: "nav", label: "Navigation", bg: "#EDE9FE", color: "#6D28D9" },
  { value: "main", label: "Main Content", bg: "#DCFCE7", color: "#166534" },
  { value: "sup", label: "Superscript", bg: "#FCE7F3", color: "#9D174D" },
  { value: "sub", label: "Subscript", bg: "#FDF2F8", color: "#BE185D" },
  { value: "mark", label: "Marked Text", bg: "#FEF08A", color: "#854D0E" },
  { value: "small", label: "Fine Print", bg: "#EEF2F7", color: "#425466" },
];

const TAG_MAP = Object.fromEntries(TAGS.map((tag) => [tag.value, tag]));

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const sanitizeAnnotations = (rawAnnotations, textLength) =>
  (Array.isArray(rawAnnotations) ? rawAnnotations : [])
    .map((annotation, index) => ({
      id: String(
        annotation?.id ??
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
        TAG_MAP[annotation.tag]
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

const wrapSegment = (text, annotations) => {
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

export const getTagMeta = (value) =>
  TAG_MAP[value] || {
    value,
    label: value,
    bg: "#EEF2F7",
    color: "#425466",
  };

export const stripAnnotationMeta = (annotations) =>
  annotations.map(({ id, start, end, text, tag }) => ({
    id,
    start,
    end,
    text,
    tag,
  }));

export const buildHtmlFromAnnotations = (rawText, annotations) => {
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
    const signature = activeAnnotations.map((annotation) => annotation.id).join(",");
    let nextCursor = cursor + 1;

    while (nextCursor < sourceText.length) {
      const nextSignature = charTags[nextCursor]
        .map((annotation) => annotation.id)
        .join(",");

      if (nextSignature !== signature) {
        break;
      }

      nextCursor += 1;
    }

    html += wrapSegment(sourceText.slice(cursor, nextCursor), activeAnnotations);
    cursor = nextCursor;
  }

  return html;
};
