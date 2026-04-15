const HEADING_TAG_PATTERN = /^h([1-6])$/i;

const TAG_ALIASES = new Map([
  ["p", "P"],
  ["paragraph", "P"],
  ["h1", "H1"],
  ["h2", "H2"],
  ["h3", "H3"],
  ["h4", "H4"],
  ["h5", "H5"],
  ["h6", "H6"],
  ["l", "L"],
  ["ul", "L"],
  ["ol", "L"],
  ["li", "LI"],
  ["list_item", "LI"],
  ["tr", "TR"],
  ["table_row", "TR"],
  ["table", "Table"],
  ["th", "TH"],
  ["td", "TD"],
  ["thead", "THead"],
  ["tbody", "TBody"],
  ["tfoot", "TFoot"],
  ["link", "Link"],
  ["a", "Link"],
  ["annot", "Annot"],
  ["code", "Code"],
  ["blockquote", "BlockQuote"],
  ["quote", "BlockQuote"],
  ["note", "Note"],
  ["reference", "Reference"],
  ["bibentry", "BibEntry"],
  ["figure", "Figure"],
  ["caption", "Caption"],
  ["formula", "Formula"],
  ["form", "Form"],
  ["artifact", "Artifact"],
  ["span", "Span"],
  ["section", "Sect"],
  ["sect", "Sect"],
  ["div", "Div"],
  ["document", "Document"],
  ["page", "Page"],
]);

const normalizeTagName = (value) => {
  const input = String(value || "").trim();

  if (!input) {
    return "";
  }

  const headingMatch = input.match(HEADING_TAG_PATTERN);

  if (headingMatch) {
    return `H${headingMatch[1]}`;
  }

  return TAG_ALIASES.get(input.toLowerCase()) || input;
};

const getFallbackTagForRole = (role, details = {}) => {
  switch (role) {
    case "heading":
      return normalizeTagName(`H${details.level || 1}`);
    case "paragraph":
      return "P";
    case "list_item":
      return "LI";
    case "table_row":
      return "TR";
    case "figure":
      return "Figure";
    case "link":
      return "Link";
    case "code":
      return "Code";
    case "quote":
      return "BlockQuote";
    case "note":
      return "Note";
    case "reference":
      return "Reference";
    case "formula":
      return "Formula";
    case "form":
      return "Form";
    case "artifact":
      return "Artifact";
    default:
      return "";
  }
};

const getRoleForTag = (tag) => {
  const normalizedTag = normalizeTagName(tag);

  if (/^H[1-6]$/.test(normalizedTag)) {
    return "heading";
  }

  switch (normalizedTag) {
    case "P":
    case "Caption":
    case "Span":
      return "paragraph";
    case "L":
    case "LI":
      return "list_item";
    case "Table":
    case "TR":
    case "TH":
    case "TD":
    case "THead":
    case "TBody":
    case "TFoot":
      return "table_row";
    case "Figure":
      return "figure";
    case "Link":
    case "Annot":
      return "link";
    case "Code":
      return "code";
    case "BlockQuote":
      return "quote";
    case "Note":
      return "note";
    case "Reference":
    case "BibEntry":
      return "reference";
    case "Formula":
      return "formula";
    case "Form":
      return "form";
    case "Artifact":
      return "artifact";
    default:
      return "";
  }
};

const resolveBlockTag = (block) => {
  const candidates = [
    ["explicit-selected-tag", block?.details?.selectedTag],
    ["saved-annotation-tag", block?.details?.savedAnnotationTag],
    ["saved-annotation-tag", block?.details?.annotationTag],
    ["saved-annotation-tag", block?.details?.explicitTag],
    ["extracted-semantic-tag", block?.tag],
    ["extracted-semantic-tag", block?.details?.nativeTag],
    ["extracted-semantic-tag", block?.details?.semanticTag],
  ];

  for (const [source, value] of candidates) {
    const normalizedTag = normalizeTagName(value);

    if (normalizedTag) {
      return {
        tag: normalizedTag,
        source,
      };
    }
  }

  const fallbackTag = normalizeTagName(
    getFallbackTagForRole(block?.role, block?.details)
  );

  return {
    tag: fallbackTag || "P",
    source: fallbackTag ? "semantic-role-fallback" : "paragraph-fallback",
  };
};

module.exports = {
  getFallbackTagForRole,
  getRoleForTag,
  normalizeTagName,
  resolveBlockTag,
};
