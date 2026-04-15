import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { FileBadge2, Layers3, MousePointerSquareDashed } from "lucide-react";
import useAnnotations from "../hooks/useAnnotations";
import { buildHtmlFromAnnotations, stripAnnotationMeta } from "../utils/buildHtml";
import { saveInlineTags } from "../services/inlineTaggerService";
import { saveLatestJobId } from "../utils/helpers";
import AnnotationList from "./AnnotationList";
import ExportPanel from "./ExportPanel";
import TagPopup from "./TagPopup";

const getAnnotationKey = (annotations) =>
  annotations.map((annotation) => annotation.id).join(",");

function InlineTagger({ rawText, docId }) {
  const containerRef = useRef(null);
  const editorPanelRef = useRef(null);
  const { annotations, add, remove } = useAnnotations();
  const [popup, setPopup] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedHtml, setSavedHtml] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [auditPanelHeight, setAuditPanelHeight] = useState(null);

  useLayoutEffect(() => {
    const editorPanel = editorPanelRef.current;

    if (!editorPanel || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const updateHeight = () => {
      setAuditPanelHeight(editorPanel.getBoundingClientRect().height);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(editorPanel);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const renderedSegments = useMemo(() => {
    const charAnnotations = Array.from({ length: rawText.length }, () => []);

    annotations.forEach((annotation) => {
      for (let index = annotation.start; index < annotation.end; index += 1) {
        if (charAnnotations[index]) {
          charAnnotations[index].push(annotation);
        }
      }
    });

    const elements = [];
    let cursor = 0;

    while (cursor < rawText.length) {
      const activeAnnotations = charAnnotations[cursor];
      const signature = getAnnotationKey(activeAnnotations);
      let nextCursor = cursor + 1;

      while (nextCursor < rawText.length) {
        const nextSignature = getAnnotationKey(charAnnotations[nextCursor]);

        if (nextSignature !== signature) {
          break;
        }

        nextCursor += 1;
      }

      const textChunk = rawText.slice(cursor, nextCursor);
      const topmostAnnotation =
        activeAnnotations[activeAnnotations.length - 1] || null;

      if (!topmostAnnotation) {
        elements.push(<span key={`${cursor}-${nextCursor}`}>{textChunk}</span>);
      } else {
        elements.push(
          <mark
            key={`${cursor}-${nextCursor}`}
            title={activeAnnotations.map((annotation) => annotation.label).join(" + ")}
            className="rounded px-[1px] transition"
            style={{
              background: topmostAnnotation.bg,
              borderBottom: `2px solid ${topmostAnnotation.color}`,
              borderRadius: 2,
              cursor: "pointer",
            }}
            onClick={() => {
              const selection = window.getSelection();

              if (!selection || !selection.isCollapsed) {
                return;
              }

              if (window.confirm("Do you want to remove this annotation?")) {
                remove(topmostAnnotation.id);
                setIsSaved(false);
              }
            }}
          >
            {textChunk}
          </mark>
        );
      }

      cursor = nextCursor;
    }

    return elements;
  }, [annotations, rawText, remove]);

  const previewHtml = useMemo(
    () => buildHtmlFromAnnotations(rawText, stripAnnotationMeta(annotations)),
    [annotations, rawText]
  );

  const openPopupForSelection = () => {
    const container = containerRef.current;
    const selection = window.getSelection();

    if (!container || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setPopup(null);
      return;
    }

    const range = selection.getRangeAt(0);

    if (!container.contains(range.commonAncestorContainer)) {
      setPopup(null);
      return;
    }

    const selectedText = selection.toString();

    if (!selectedText.trim()) {
      setPopup(null);
      return;
    }

    const offsetRange = document.createRange();
    offsetRange.selectNodeContents(container);
    offsetRange.setEnd(range.startContainer, range.startOffset);

    const start = offsetRange.toString().length;
    const end = start + selectedText.length;
    const selectionRect = range.getBoundingClientRect();
    setPopup({
      start,
      end,
      text: selectedText,
      x: selectionRect.left,
      y: selectionRect.bottom + 12,
    });
  };

  const applyTag = (tag) => {
    if (!popup) {
      return;
    }

    add({
      start: popup.start,
      end: popup.end,
      text: popup.text,
      tag,
    });

    setPopup(null);
    setIsSaved(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");

    try {
      const cleanedAnnotations = stripAnnotationMeta(annotations);
      const response = await saveInlineTags(docId, cleanedAnnotations);
      if (response?.jobId) {
        saveLatestJobId(response.jobId);
      }
      setSavedHtml(response.generatedHtml);
      setIsSaved(true);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-3">
        {[
          {
            icon: FileBadge2,
            title: "Immutable source",
            body: "Raw PDF text stays unchanged and serves as the single source of truth.",
          },
          {
            icon: MousePointerSquareDashed,
            title: "Select + tag",
            body: "Pick any phrase, sentence, or multi-line segment and apply semantic HTML tags.",
          },
          {
            icon: Layers3,
            title: "Offset-driven overlap",
            body: "Annotations are stored as character ranges, so multiple tags can coexist on the same text.",
          },
        ].map((item) => (
          <div key={item.title} className="panel-surface px-5 py-5">
            <item.icon className="mb-3 h-6 w-6 text-slate-700" />
            <h2 className="font-display text-xl font-bold text-slate-950">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <div ref={editorPanelRef} className="panel-surface overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Raw Text Editor
            </p>
            <h2 className="font-display text-2xl font-bold text-slate-950">
              Inline tagging workspace
            </h2>
          </div>

          <div className="relative">
            <div
              ref={containerRef}
              className="max-h-[720px] overflow-auto px-5 py-6 text-[15px] leading-8 text-slate-800 sm:px-6"
              onMouseUp={openPopupForSelection}
            >
              <div className="select-text whitespace-pre-wrap">{renderedSegments}</div>
              {popup ? <TagPopup x={popup.x} y={popup.y} onSelect={applyTag} /> : null}
            </div>
          </div>
        </div>

        <div
          className="min-h-0"
          style={auditPanelHeight ? { height: `${auditPanelHeight}px` } : undefined}
        >
          <AnnotationList annotations={annotations} onRemove={remove} />
        </div>
      </section>

      <ExportPanel
        generatedHtml={savedHtml || previewHtml}
        annotationCount={annotations.length}
        saving={saving}
        onSave={handleSave}
        error={saveError}
        isSaved={isSaved}
      />
    </div>
  );
}

export default InlineTagger;
