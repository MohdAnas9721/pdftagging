import { classNames } from "../../utils/helpers";

function PrimaryButton({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50",
    accent: "bg-teal-700 text-white hover:bg-teal-600",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };

  return (
    <button
      className={classNames(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default PrimaryButton;
