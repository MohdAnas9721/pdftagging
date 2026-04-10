function EmptyState({ title, description }) {
  return (
    <div className="panel-muted flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
      <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-xl text-sm text-slate-600">{description}</p>
    </div>
  );
}

export default EmptyState;
