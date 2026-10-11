import { useEffect, useState } from 'react';
import { apiFetch } from '../../../utils/apiFetch';

const HISTORY_LIMIT = 48; // server caps /api/history at 48

// Records written by manual test runs are not readings and must never be charted.
const isTestRecord = (rec) => /\btest\b/i.test(`${rec.advisory || ''} ${rec.source || ''}`);

/**
 * Stored Delhi readings from GET /api/history (DynamoDB `AirQualityReadings`, newest last).
 * Returns the server's storage `mode` so the chart can say where the numbers came from,
 * and an `error` instead of any substitute data when the request fails.
 */
export function useReadingHistory() {
  const [state, setState] = useState({ status: 'loading', mode: null, records: [], error: null });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/history?limit=${HISTORY_LIMIT}`);
        const body = await res.json();
        if (!res.ok || body.success === false) {
          throw new Error(body.error || `HTTP status ${res.status}`);
        }
        const records = (body.data || [])
          .filter((rec) => !isTestRecord(rec))
          .map((rec) => ({ ...rec, timestamp: Number(rec.timestamp || Date.parse(rec.dateStr)) }))
          .filter((rec) => Number.isFinite(rec.timestamp))
          .sort((a, b) => a.timestamp - b.timestamp);
        if (isMounted) setState({ status: 'ready', mode: body.mode || null, records, error: null });
      } catch (err) {
        if (isMounted) setState({ status: 'error', mode: null, records: [], error: err.message });
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
