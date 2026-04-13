import { useLayoutEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { createPortal } from "react-dom";
import { TAGS } from "../utils/buildHtml";

const POPUP_WIDTH = 240;
const POPUP_HEIGHT = 448;
const VIEWPORT_GAP = 12;

function TagPopup({ x, y, onSelect }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({
    left: VIEWPORT_GAP,
    top: VIEWPORT_GAP,
    height: POPUP_HEIGHT,
  });

  const visibleTags = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return TAGS;
    }

    return TAGS.filter(
      (tag) =>
        tag.value.toLowerCase().includes(normalizedQuery) ||
        tag.label.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  useLayoutEffect(() => {
    const maxHeight = Math.max(240, window.innerHeight - VIEWPORT_GAP * 2);
    const popupHeight = Math.min(POPUP_HEIGHT, maxHeight);
    const maxLeft = Math.max(
      VIEWPORT_GAP,
      window.innerWidth - POPUP_WIDTH - VIEWPORT_GAP
    );
    const maxTop = Math.max(
      VIEWPORT_GAP,
      window.innerHeight - popupHeight - VIEWPORT_GAP
    );
    const left = Math.min(Math.max(x, VIEWPORT_GAP), maxLeft);
    const preferredTop = y;
    const fallbackTop = y - popupHeight - VIEWPORT_GAP * 2;
    const top =
      preferredTop <= maxTop
        ? preferredTop
        : Math.max(VIEWPORT_GAP, Math.min(fallbackTop, maxTop));

    setPosition({
      left,
      top,
      height: popupHeight,
    });
  }, [x, y]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    (
      <div
        className="fixed z-[10000] flex w-60 max-w-[calc(100vw-24px)] flex-col rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl"
        style={{ left: position.left, top: position.top, height: position.height }}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
      >
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Apply tag
        </p>
        <div className="sticky top-0 z-10 bg-white px-1 pb-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tags"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {visibleTags.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(tag.value)}
                className="flex items-center justify-between rounded-2xl px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    {tag.value}
                  </span>
                </span>
                <span
                  className="rounded-full px-2 py-1 text-xs font-semibold"
                  style={{ backgroundColor: tag.bg, color: tag.color }}
                >
                  {tag.label}
                </span>
              </button>
            ))}
            {!visibleTags.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                No matching tags found.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    document.body
  );
}

export default TagPopup;
