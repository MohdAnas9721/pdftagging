function LogPanel({ logs = [] }) {
  return (
    <div className="panel-muted max-h-[28rem] overflow-auto p-4">
      <div className="space-y-3">
        {logs.length ? (
          logs
            .slice()
            .reverse()
            .map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {log.level}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{log.message}</p>
              </div>
            ))
        ) : (
          <p className="text-sm text-slate-500">Pipeline logs will appear here.</p>
        )}
      </div>
    </div>
  );
}

export default LogPanel;
