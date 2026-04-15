const { normalizeTagName } = require("../../utils/tagging");

const sortTextBlocks = (blocks = []) =>
  [...blocks].sort((left, right) => left.top - right.top || left.left - right.left);

const normalizeComparableText = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .trim();

const findAllIndexes = (value, searchValue) => {
  const indexes = [];

  if (!value || !searchValue) {
    return indexes;
  }

  let cursor = 0;

  while (cursor <= value.length - searchValue.length) {
    const nextIndex = value.indexOf(searchValue, cursor);

    if (nextIndex < 0) {
      break;
    }

    indexes.push(nextIndex);
    cursor = nextIndex + 1;
  }

  return indexes;
};

const findBlockRange = (rawText, blockText, cursor) => {
  if (!blockText) {
    return null;
  }

  const directIndex = rawText.indexOf(blockText, cursor);

  if (directIndex >= 0) {
    return {
      start: directIndex,
      end: directIndex + blockText.length,
    };
  }

  const relaxedIndex = rawText.indexOf(blockText, Math.max(0, cursor - 24));

  if (relaxedIndex >= 0) {
    return {
      start: relaxedIndex,
      end: relaxedIndex + blockText.length,
    };
  }

  return null;
};

const trimSegmentText = (text, start, end) => {
  let nextStart = start;
  let nextEnd = end;

  while (nextStart < nextEnd && /\s/.test(text[nextStart] || "")) {
    nextStart += 1;
  }

  while (nextEnd > nextStart && /\s/.test(text[nextEnd - 1] || "")) {
    nextEnd -= 1;
  }

  return {
    start: nextStart,
    end: nextEnd,
    text: text.slice(nextStart, nextEnd),
  };
};

const resolveLocalAnnotationRange = (block, annotation) => {
  if (
    Number.isFinite(annotation.localStart) &&
    Number.isFinite(annotation.localEnd) &&
    annotation.localEnd > annotation.localStart
  ) {
    return {
      start: Math.max(0, annotation.localStart),
      end: Math.min((block.text || "").length, annotation.localEnd),
    };
  }

  if (!Number.isFinite(block.globalStart) || !Number.isFinite(block.globalEnd)) {
    return null;
  }

  return {
    start: Math.max(0, annotation.start - block.globalStart),
    end: Math.min((block.text || "").length, annotation.end - block.globalStart),
  };
};

const scoreBlockTextMatch = (annotation, pageText, block, localStart) => {
  const normalizedPageText = normalizeComparableText(pageText);
  const normalizedBlockText = normalizeComparableText(block.text || "");
  const annotationText = normalizeComparableText(
    annotation.textContent || annotation.text || ""
  );

  if (!normalizedPageText || !normalizedBlockText || !annotationText) {
    return Number.MAX_SAFE_INTEGER;
  }

  const blockOccurrences = findAllIndexes(normalizedPageText, normalizedBlockText);

  if (!blockOccurrences.length) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.min(
    ...blockOccurrences.map((blockIndex) =>
      Math.abs(blockIndex + localStart - Number(annotation.pageStartOffset || 0))
    )
  );
};

const findLocalAnnotationMatch = (blockText, annotation) => {
  const exactText = String(annotation.textContent || annotation.text || "").trim();

  if (!exactText) {
    return null;
  }

  let start = blockText.indexOf(exactText);

  if (start < 0) {
    start = blockText.toLowerCase().indexOf(exactText.toLowerCase());
  }

  if (start < 0) {
    return null;
  }

  return {
    localStart: start,
    localEnd: start + exactText.length,
  };
};

const assignAnnotationsToTextBlocks = (page, annotations, pageText = "") => {
  const remainingAnnotations = [...annotations];
  const assignments = new Map();

  sortTextBlocks(page.textBlocks).forEach((block) => {
    const blockId = block.sourceBlockId || block.id;

    remainingAnnotations.forEach((annotation) => {
      const match = findLocalAnnotationMatch(block.text || "", annotation);

      if (!match) {
        return;
      }

      const nextAssigned = {
        ...annotation,
        targetBlockId: blockId,
        localStart: match.localStart,
        localEnd: match.localEnd,
        _matchScore: scoreBlockTextMatch(annotation, pageText, block, match.localStart),
      };
      const existingAssigned = assignments.get(annotation.annotationId || annotation.id);

      if (
        !existingAssigned ||
        nextAssigned._matchScore < existingAssigned._matchScore
      ) {
        assignments.set(annotation.annotationId || annotation.id, nextAssigned);
      }
    });
  });

  return Array.from(assignments.values()).map(({ _matchScore, ...annotation }) => annotation);
};

const createSegmentBlock = (block, segmentIndex, segmentStart, segmentEnd, selectedTag) => {
  const trimmedSegment = trimSegmentText(block.text || "", segmentStart, segmentEnd);

  if (!trimmedSegment.text) {
    return null;
  }

  const safeLength = Math.max((block.text || "").length, 1);
  const averageCharWidth = Number(block.width || 0) / safeLength;
  const derivedLeft = Number(
    (Number(block.left || 0) + averageCharWidth * trimmedSegment.start).toFixed(2)
  );
  const derivedWidth = Number(
    Math.max(averageCharWidth || 0, averageCharWidth * trimmedSegment.text.length).toFixed(2)
  );

  return {
    ...block,
    id: `${block.id}-segment-${segmentIndex + 1}`,
    sourceBlockId: block.sourceBlockId || block.id,
    text: trimmedSegment.text,
    left: Number.isFinite(derivedLeft) ? derivedLeft : block.left,
    width: Number.isFinite(derivedWidth) && derivedWidth > 0 ? derivedWidth : block.width,
    selectedTag: normalizeTagName(selectedTag),
    items: [],
  };
};

const splitBlockByAnnotations = (block, annotations) => {
  if (!annotations.length || !block.text) {
    return [
      {
        ...block,
        sourceBlockId: block.sourceBlockId || block.id,
      },
    ];
  }

  const boundaries = new Set([0, block.text.length]);

  annotations.forEach((annotation) => {
    const localRange = resolveLocalAnnotationRange(block, annotation);

    if (!localRange) {
      return;
    }

    const relativeStart = Math.max(0, localRange.start);
    const relativeEnd = Math.min(block.text.length, localRange.end);

    if (relativeEnd <= relativeStart) {
      return;
    }

    boundaries.add(relativeStart);
    boundaries.add(relativeEnd);
  });

  const sortedBoundaries = [...boundaries].sort((left, right) => left - right);
  const segments = [];

  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const start = sortedBoundaries[index];
    const end = sortedBoundaries[index + 1];
    const coveringAnnotation = [...annotations]
      .reverse()
      .find((annotation) => {
        const localRange = resolveLocalAnnotationRange(block, annotation);

        if (!localRange) {
          return false;
        }

        return localRange.start < end && localRange.end > start;
      });
    const segment = createSegmentBlock(
      block,
      index,
      start,
      end,
      coveringAnnotation?.tag || ""
    );

    if (segment) {
      segments.push(segment);
    }
  }

  return segments;
};

const applyAnnotationsToParsedOutput = (
  parsedOutput,
  rawText,
  annotations,
  sourcePageTexts = []
) => {
  if (!rawText || !Array.isArray(annotations) || !annotations.length) {
    return parsedOutput;
  }

  const normalizedAnnotations = annotations
    .map((annotation, index) => ({
      id: String(annotation?.id || `annotation-${index + 1}`),
      annotationId: String(
        annotation?.annotationId || annotation?.id || `annotation-${index + 1}`
      ),
      start: Number(annotation?.start),
      end: Number(annotation?.end),
      page: Number(annotation?.page) || null,
      pageStartOffset: Number(annotation?.pageStartOffset),
      pageEndOffset: Number(annotation?.pageEndOffset),
      tag: normalizeTagName(annotation?.selectedTag || annotation?.tag),
      text: String(annotation?.text || ""),
      textContent: String(annotation?.textContent || annotation?.text || ""),
    }))
    .filter(
      (annotation) =>
        Number.isFinite(annotation.start) &&
        Number.isFinite(annotation.end) &&
        annotation.end > annotation.start &&
        annotation.tag
    )
    .sort((left, right) => left.start - right.start || left.end - right.end);

  if (!normalizedAnnotations.length) {
    return parsedOutput;
  }

  let cursor = 0;
  const pages = parsedOutput.pages.map((page) => {
    const pageAnnotations = normalizedAnnotations.filter(
      (annotation) => !annotation.page || annotation.page === page.pageIndex
    );
    const assignedAnnotations = assignAnnotationsToTextBlocks(
      page,
      pageAnnotations,
      sourcePageTexts[page.pageIndex - 1] || ""
    );
    const sortedBlocks = sortTextBlocks(page.textBlocks);
    const rangedBlocks = sortedBlocks.map((block) => {
      const range = findBlockRange(rawText, block.text, cursor);

      if (!range) {
        return {
          ...block,
          sourceBlockId: block.sourceBlockId || block.id,
        };
      }

      cursor = range.end;

      return {
        ...block,
        globalStart: range.start,
        globalEnd: range.end,
        sourceBlockId: block.sourceBlockId || block.id,
      };
    });

    const expandedBlocks = rangedBlocks.flatMap((block) => {
      const directMatches = assignedAnnotations.filter(
        (annotation) =>
          annotation.targetBlockId === (block.sourceBlockId || block.id) ||
          annotation.targetBlockId === block.id
      );

      if (directMatches.length) {
        return splitBlockByAnnotations(block, directMatches).map(
          ({ globalStart, globalEnd, ...segment }) => segment
        );
      }

      if (!Number.isFinite(block.globalStart) || !Number.isFinite(block.globalEnd)) {
        return [
          {
            ...block,
            sourceBlockId: block.sourceBlockId || block.id,
          },
        ];
      }

      const blockAnnotations = pageAnnotations.filter(
        (annotation) =>
          annotation.start < block.globalEnd && annotation.end > block.globalStart
      );

      return splitBlockByAnnotations(block, blockAnnotations).map(
        ({ globalStart, globalEnd, ...segment }) => segment
      );
    });

    return {
      ...page,
      textBlocks: expandedBlocks,
      metadata: {
        ...page.metadata,
        textBlockCount: expandedBlocks.length,
      },
    };
  });

  return {
    ...parsedOutput,
    pages,
    document: {
      ...parsedOutput.document,
      annotationOverrideCount: normalizedAnnotations.length,
    },
  };
};

module.exports = {
  applyAnnotationsToParsedOutput,
};
