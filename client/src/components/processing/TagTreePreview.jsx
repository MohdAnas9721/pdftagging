import { useEffect } from "react";
import EmptyState from "../common/EmptyState";

const countTagNodes = (node) =>
  1 + (node.children || []).reduce((sum, child) => sum + countTagNodes(child), 0);

const formatActiveTags = (tags) => {
  if (!tags?.length) {
    return "No active tags detected yet.";
  }

  const visibleTags = tags.slice(0, 8);
  const remaining = tags.length - visibleTags.length;

  return `${visibleTags.join(", ")}${remaining > 0 ? `, +${remaining} more` : ""}`;
};

function TagNode({ node, depth = 0 }) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl border border-slate-200 bg-white p-3"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {node.type}
            </p>
            <p className="mt-1 font-medium text-slate-900">{node.label}</p>
          </div>
          {node.meta?.pageIndex ? (
            <span className="text-xs text-slate-500">Page {node.meta.pageIndex}</span>
          ) : null}
        </div>
      </div>
      {node.children?.length
        ? node.children.map((child) => (
            <TagNode key={child.id} node={child} depth={depth + 1} />
          ))
        : null}
    </div>
  );
}

function TagTreePreview({ tags, extractedTags }) {
  const renderedCount =
    tags?.summary?.uniqueExtractedTagCount ??
    tags?.summary?.nodeCount ??
    0;

  useEffect(() => {
    console.debug("[pdf-tag-debug] tag tree rendered count:", renderedCount);
  }, [renderedCount, extractedTags?.summary?.dedupedCount]);

  if (!tags?.root) {
    return (
      <EmptyState
        title="Tag tree pending"
        description="Generated PDF-style tagging structure will appear here after semantic mapping completes."
      />
    );
  }

  const totalTagNodes =
    tags.summary?.uniqueExtractedTagCount ??
    tags.summary?.nodeCount ??
    Math.max(countTagNodes(tags.root) - 1, 0);
  const pageCount = tags.summary?.pageCount ?? tags.root.children?.length ?? 0;
  const supportedTagCount = tags.summary?.supportedTagCount ?? 0;
  const activeTags = tags.summary?.activeTags || [];
  const extractionMode = tags.summary?.extractionMode || "fallback-inference";

  return (
    <div className="space-y-4">
      <div className="panel-muted p-4">
        <p className="text-sm text-slate-500">Supported tags</p>
        <p className="mt-2 text-sm font-medium text-slate-900">
          {totalTagNodes} generated tag nodes across {pageCount} page
          {pageCount === 1 ? "" : "s"}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Active tags: {formatActiveTags(activeTags)}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Extraction mode: {extractionMode}. Engine support: {supportedTagCount} structural and semantic tags.
        </p>
      </div>
      <TagNode node={tags.root} />
    </div>
  );
}

export default TagTreePreview;
