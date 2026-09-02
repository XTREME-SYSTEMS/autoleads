import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Loads a list of entity records with loading, error, and refresh support.
 * @param {string} entityName - e.g. "Opportunity", "BidInvitation"
 * @param {object} options - { sort, limit, filter, refreshKey }
 */
export function useEntityList(entityName, options = {}) {
  const { sort = "-created_date", limit = 50, filter = {}, refreshKey = 0 } = options;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    base44.entities[entityName]
      .filter(filter, sort, limit)
      .then((data) => { if (active) { setRecords(data || []); setError(null); } })
      .catch((err) => { if (active) { setError(err); setRecords([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [entityName, JSON.stringify(filter), sort, limit, refreshKey]);

  return { records, loading, error };
}