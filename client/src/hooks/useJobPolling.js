import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPdfStatus } from "../services/pdfService";

const activeStates = new Set(["processing", "uploaded"]);

function useJobPolling(jobId, enabled = true) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState("");
  const intervalRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId || !enabled) {
      return;
    }

    try {
      const data = await getPdfStatus(jobId);
      setJob(data.job);
      setError("");
      setLoading(false);
    } catch (fetchError) {
      setError(fetchError.message);
      setLoading(false);
    }
  }, [enabled, jobId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!enabled || !jobId) {
      return undefined;
    }

    if (activeStates.has(job?.state)) {
      intervalRef.current = window.setInterval(fetchStatus, 2000);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [enabled, fetchStatus, job?.state, jobId]);

  const progress = useMemo(() => {
    if (!job?.steps?.length) {
      return 0;
    }

    const complete = job.steps.filter((step) => step.status === "success").length;
    return Math.round((complete / job.steps.length) * 100);
  }, [job]);

  return {
    job,
    loading,
    error,
    progress,
    refresh: fetchStatus,
    setJob,
  };
}

export default useJobPolling;
