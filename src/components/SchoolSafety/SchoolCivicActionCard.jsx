import React from 'react';
import {
  FileText,
  CheckCircle2,
  Lock
} from 'lucide-react';

/**
 * Section 7: Civic Action & Petition Readiness Gating Card
 */
export default function SchoolCivicActionCard({
  effectiveCivicEligibility,
  effectiveSummary,
  onEvidenceComplete,
  evidencePackage
}) {
  return (
    <section className="ssd-section ssd-civic-section" aria-labelledby="civic-action-heading">
      <div className="ssd-section-header">
        <div>
          <h2 id="civic-action-heading">
            <FileText size={18} aria-hidden="true" />
            <span>Civic Action & Petition Readiness</span>
          </h2>
          <p className="ssd-section-sub">
            Deterministic threshold gating: civic action workflows require 14 complete days of verified continuous evidence.
          </p>
        </div>
      </div>

      <article className={`ssd-card ssd-civic-card ${effectiveCivicEligibility.eligible ? 'eligible' : 'locked'}`}>
        <div className="ssd-civic-top">
          <div className="ssd-civic-icon-box" aria-hidden="true">
            {effectiveCivicEligibility.eligible ? (
              <CheckCircle2 size={32} color="#10b981" />
            ) : (
              <Lock size={32} color="#94a3b8" />
            )}
          </div>

          <div className="ssd-civic-details">
            <div className="ssd-civic-status-header">
              <span className={`ssd-civic-status-pill ${effectiveCivicEligibility.eligible ? 'eligible' : 'locked'}`}>
                {effectiveCivicEligibility.status}
              </span>
              <span className="ssd-civic-days-pill">
                {effectiveCivicEligibility.observedDays} / {effectiveCivicEligibility.requiredDays} Observed Days
              </span>
            </div>

            <h3 className="ssd-civic-title">
              {effectiveCivicEligibility.eligible
                ? 'Evidence Period Complete - Action Workflow Available'
                : 'Continue Monitoring - Evidence Incomplete'}
            </h3>

            <p className="ssd-civic-explanation">
              {effectiveCivicEligibility.eligible
                ? 'All 14 required calendar monitoring days have been empirically observed and verified via surrounding regulatory station telemetry. The verified evidence package is ready for administrative petitioning.'
                : '14 days of sufficient evidence are required before the civic action workflow becomes available. Automated petition drafting remains locked until empirical continuity criteria are satisfied.'}
            </p>

            {effectiveSummary && effectiveCivicEligibility.eligible && (
              <div className="ssd-civic-summary-preview">
                <span>14-Day Average PM2.5: <strong>{effectiveSummary.averagePm25 ?? '--'} µg/m³</strong></span>
                <span>Highest Day: <strong>{effectiveSummary.highestDailyPm25 ?? '--'} µg/m³</strong></span>
                <span>Lowest Day: <strong>{effectiveSummary.lowestDailyPm25 ?? '--'} µg/m³</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="ssd-civic-footer">
          {effectiveCivicEligibility.eligible ? (
            <button
              type="button"
              id="review-civic-package-btn"
              className="ssd-civic-btn eligible"
              onClick={() => {
                if (onEvidenceComplete) {
                  onEvidenceComplete(evidencePackage);
                }
              }}
              aria-label="Review verified civic action evidence package"
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Review Civic Action Package</span>
            </button>
          ) : (
            <button
              type="button"
              id="civic-action-locked-btn"
              className="ssd-civic-btn locked"
              disabled
              aria-disabled="true"
              aria-label="Civic action locked - continue monitoring"
            >
              <Lock size={15} aria-hidden="true" />
              <span>Civic Action Locked (Requires 14 Observed Days)</span>
            </button>
          )}
          <span className="ssd-civic-note">
            {effectiveCivicEligibility.eligible
              ? 'Deterministic evidence verification complete. No fabricated data.'
              : 'Monitored continuously via Delhi regulatory stations. Telemetry refreshed automatically.'}
          </span>
        </div>
      </article>
    </section>
  );
}
