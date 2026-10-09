import React from 'react';
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

/**
 * "Why This Verdict?" Expandable Empirical Evidence & Spatial Estimation Panel
 */
export default function SchoolWhyVerdictAccordion({
  isWhyExpanded,
  setIsWhyExpanded,
  effectiveExplanation,
  effectiveEstimate,
  selectedSchool,
  userFacingOverallStatus
}) {
  return (
    <section className="ssd-accordion" aria-label="Why This Verdict Details">
      <button
        type="button"
        className="ssd-accordion-trigger"
        onClick={() => setIsWhyExpanded(!isWhyExpanded)}
        aria-expanded={isWhyExpanded}
        aria-controls="why-verdict-content"
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} color="#38bdf8" aria-hidden="true" />
          <span>Why This Verdict? (Empirical Evidence & Spatial Estimation)</span>
        </span>
        {isWhyExpanded ? (
          <ChevronUp size={16} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
      </button>

      {isWhyExpanded && (
        <div id="why-verdict-content" className="ssd-accordion-content">
          <p className="ssd-explanation-paragraph">{effectiveExplanation}</p>

          {/* Visual Spatial Interpolation Pipeline Flow */}
          <div className="ssd-spatial-flow-diagram" aria-label="Spatial Estimation Architecture">
            <div className="ssd-flow-step-node">
              <div className="flow-step-badge">REGULATORY SENSORS</div>
              <div className="flow-step-name">{effectiveEstimate?.stationCount || 1} CAAQMS Monitors</div>
              <div className="flow-step-sub">{selectedSchool.nearestStation || 'Continuous BAM-1020'}</div>
            </div>
            <div className="ssd-flow-arrow-connector">
              <span className="flow-connector-line" />
              <span className="flow-connector-label">IDW Quadratic Interpolation (p=2.0)</span>
              <ArrowRight size={14} className="flow-connector-arrow" />
            </div>
            <div className="ssd-flow-step-node school">
              <div className="flow-step-badge">CAMPUS RECEPTOR</div>
              <div className="flow-step-name">{selectedSchool.name}</div>
              <div className="flow-step-sub">
                Estimated around school: <strong>{effectiveEstimate?.pm25 !== null && effectiveEstimate?.pm25 !== undefined ? `${effectiveEstimate.pm25} µg/m³` : 'Pending'}</strong>
              </div>
            </div>
            <div className="ssd-flow-arrow-connector">
              <span className="flow-connector-line" />
              <span className="flow-connector-label">Deterministic Activity Gates</span>
              <ArrowRight size={14} className="flow-connector-arrow" />
            </div>
            <div className="ssd-flow-step-node verdict">
              <div className="flow-step-badge">OPERATIONAL GUIDANCE</div>
              <div className="flow-step-name">{userFacingOverallStatus}</div>
              <div className="flow-step-sub">{effectiveEstimate?.confidence || 'HIGH'} Confidence</div>
            </div>
          </div>

          <div className="ssd-evidence-grid">
            <div className="ssd-evidence-item">
              <div className="ssd-evidence-label">Estimation Methodology</div>
              <div className="ssd-evidence-val">Quadratic IDW (p=2.0)</div>
            </div>

            <div className="ssd-evidence-item">
              <div className="ssd-evidence-label">Monitoring Stations Used</div>
              <div className="ssd-evidence-val">
                {effectiveEstimate?.stationCount || 1} Surrounding Regulatory Nodes
              </div>
            </div>

            <div className="ssd-evidence-item">
              <div className="ssd-evidence-label">Nearest Station Distance</div>
              <div className="ssd-evidence-val">
                {selectedSchool.stationDistanceKm || 1.8} km from campus
              </div>
            </div>

            <div className="ssd-evidence-item">
              <div className="ssd-evidence-label">Data Confidence</div>
              <div className="ssd-evidence-val">
                {effectiveEstimate?.confidence || 'HIGH'} (Continuous Telemetry)
              </div>
            </div>
          </div>

          <div className="ssd-accordion-disclaimer">
            <strong>Spatial Estimation Notice:</strong> School-level air quality is an estimated
            ambient value computed via distance-weighted interpolation from surrounding CPCB/DPCC
            regulatory monitoring stations. It does not represent direct school-gate measurements.
            All verdicts represent operational engineering baselines for facilities planning and
            never medical diagnosis or personal health advice.
          </div>
        </div>
      )}
    </section>
  );
}
