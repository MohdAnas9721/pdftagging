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
  ["a", "Link"],
  ["link", "Link"],
  ["annot", "Annot"],
  ["figure", "Figure"],
  ["blockquote", "BlockQuote"],
  ["quote", "BlockQuote"],
  ["code", "Code"],
  ["note", "Note"],
  ["reference", "Reference"],
  ["formula", "Formula"],
  ["form", "Form"],
  ["artifact", "Artifact"],
  ["span", "Span"],
]);

export const normalizeTagName = (value) => {
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

export const getFallbackTagForRole = (role, details = {}) => {
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

export const getDisplayTag = (item) =>
  normalizeTagName(
    item?.tag ||
      item?.selectedTag ||
      item?.savedAnnotationTag ||
      item?.annotationTag ||
      item?.explicitTag ||
      item?.details?.selectedTag ||
      item?.details?.savedAnnotationTag ||
      item?.details?.annotationTag ||
      item?.details?.explicitTag ||
      item?.details?.nativeTag ||
      item?.details?.semanticTag ||
      getFallbackTagForRole(item?.role, item?.details)
  ) || "P";
