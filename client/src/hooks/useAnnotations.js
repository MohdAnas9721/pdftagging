import { useState } from "react";
import { getTagMeta } from "../utils/buildHtml";

function useAnnotations() {
  const [annotations, setAnnotations] = useState([]);

  const add = ({ start, end, text, tag }) => {
    const meta = getTagMeta(tag);

    setAnnotations((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        start,
        end,
        text,
        tag,
        bg: meta.bg,
        color: meta.color,
        label: meta.label,
      },
    ]);
  };

  const remove = (annotationId) => {
    setAnnotations((current) =>
      current.filter((annotation) => annotation.id !== annotationId)
    );
  };

  const reset = () => {
    setAnnotations([]);
  };

  return {
    annotations,
    add,
    remove,
    reset,
  };
}

export default useAnnotations;
