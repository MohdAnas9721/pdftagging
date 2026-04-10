function SectionCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`panel-surface p-5 sm:p-6 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h2 className="font-display text-xl font-semibold text-slate-900">
                {title}
              </h2>
            ) : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export default SectionCard;
