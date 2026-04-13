import { Link, useLocation } from "react-router-dom";
import { classNames } from "../utils/helpers";

function AppLayout({ children }) {
  const location = useLocation();
  const processingTarget = location.pathname.startsWith("/process")
    ? location.pathname
    : "/pipeline";
  const resultsTarget = location.pathname.startsWith("/result")
    ? location.pathname
    : "/pipeline";

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link to="/" className="font-display text-xl font-bold text-slate-900">
              Leometric
            </Link>
            <p className="text-sm text-slate-600">
              Full-stack PDF inline tagging with a preserved legacy processing flow
            </p>
          </div>

          <nav className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
            {[
              { label: "Workspace", to: "/" },
              { label: "Legacy", to: "/pipeline" },
              { label: "Processing", to: processingTarget },
              { label: "Results", to: resultsTarget },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={classNames(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  location.pathname === item.to
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

export default AppLayout;
