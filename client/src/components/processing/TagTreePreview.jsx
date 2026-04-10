import EmptyState from "../common/EmptyState";

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

function TagTreePreview({ tags }) {
  if (!tags?.root) {
    return (
      <EmptyState
        title="Tag tree pending"
        description="Generated PDF-style tagging structure will appear here after semantic mapping completes."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel-muted p-4">
        <p className="text-sm text-slate-500">Supported tags</p>
        <p className="mt-2 text-sm text-slate-700">
          {tags.summary.supportedTags.join(", ")}
        </p>
      </div>
      <TagNode node={tags.root} />
    </div>
  );
}

export default TagTreePreview;
