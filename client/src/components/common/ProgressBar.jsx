function ProgressBar({ value }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-gradient-to-r from-teal-700 via-emerald-500 to-amber-400 transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default ProgressBar;
