import React from 'react';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';

/**
 * Scheduled Activity Windows & Operational Guidance Timeline Grid
 */
export default function SchoolActivityTimeline({
  effectiveActivityResults,
  mapUserFacingStatus
}) {
  return (
    <section className="ssd-section" aria-labelledby="activity-timeline-heading">
      <div className="ssd-section-header">
        <div>
          <h2 id="activity-timeline-heading">
            <Clock size={18} aria-hidden="true" />
            <span>Scheduled Activity Windows & Operational Guidance</span>
          </h2>
          <p className="ssd-section-sub">
            Deterministic operational guidance per scheduled activity window based on estimated particulate exposure.
          </p>
        </div>
      </div>

      <div className="ssd-activities-grid">
        {effectiveActivityResults.map((act, index) => {
          const userVerdict = mapUserFacingStatus(act.verdict);
          const verdictLower = (act.verdict || 'insufficient').toLowerCase().replace('_strict', '');

          return (
            <article key={act.activityId || index} className="ssd-activity-card">
              <div className="ssd-activity-top">
                <div>
                  <h3 className="ssd-activity-title">{act.activity}</h3>
                  <div className="ssd-activity-chips" style={{ marginTop: '0.35rem' }}>
                    <span className="ssd-chip">
                      <Clock size={11} aria-hidden="true" />
                      <span>{act.timeWindow || 'Scheduled'}</span>
                    </span>
                    {act.evaluatedPm25 !== null && act.evaluatedPm25 !== undefined && (
                      <span className="ssd-chip pm25">
                        {`Estimated: ${act.evaluatedPm25} µg/m³`}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`ssd-badge-verdict ${verdictLower}`}>
                  {userVerdict === 'GO' && <ShieldCheck size={12} aria-hidden="true" />}
                  {userVerdict === 'MODIFY' && <AlertTriangle size={12} aria-hidden="true" />}
                  {userVerdict === 'INDOORS' && <ShieldAlert size={12} aria-hidden="true" />}
                  <span>{userVerdict}</span>
                </span>
              </div>

              <p className="ssd-activity-reason">
                {act.operationalGuidance || act.reason || 'Operational guidance pending data update.'}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
