import { classNames } from "../../utils/helpers";

function DetailTabs({ tabs, activeTab, onChange, children }) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={classNames(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              activeTab === tab.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

export default DetailTabs;
