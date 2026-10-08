import React, { useState } from 'react';
import { Heart, Wind, Brain, AlertTriangle, ShieldAlert, Users, Baby, ChevronRight } from 'lucide-react';

/**
 * PhysiologicalImpactMatrix
 * Visualizes anatomical organ vulnerability (Cardiovascular, Respiratory, Cognitive)
 * alongside a demographic sensitivity comparison (Children vs Adults).
 * Replaces large textual health paragraphs with high-impact visual indicators.
 */
export default function PhysiologicalImpactMatrix({
  pollutantId = 'pm25',
  pollutantName = 'Fine Particulate Matter',
  accentColor = '#ef4444',
  customImpacts = null,
}) {
  const [activeDemographic, setActiveDemographic] = useState('both'); // 'both' | 'children' | 'adults'

  // Default pollutant-specific impact baselines grounded in epidemiology
  const impactProfiles = {
    pm25: {
      cardio: { pct: 88, label: 'High', detail: 'Microscopic particles penetrate alveolar-capillary barrier into systemic circulation' },
      resp: { pct: 96, label: 'Very High', detail: 'Deep pulmonary alveolar deposition causing chronic inflammation and reduced FEV1' },
      cogn: { pct: 68, label: 'Moderate', detail: 'Neuro-vascular inflammation linked to cognitive fatigue and attention deficit' },
    },
    pm10: {
      cardio: { pct: 62, label: 'Moderate', detail: 'Systemic inflammation secondary to tracheobronchial oxidative stress' },
      resp: { pct: 94, label: 'Very High', detail: 'Trapped in upper airways, triggering severe bronchitis and asthma flares' },
      cogn: { pct: 45, label: 'Low–Mod', detail: 'Indirect systemic inflammatory mediators affecting general vitality' },
    },
    no2: {
      cardio: { pct: 72, label: 'High', detail: 'Endothelial dysfunction and elevated cardiovascular mortality risk' },
      resp: { pct: 92, label: 'Very High', detail: 'Deep mucosal airway irritant causing hyper-responsiveness in asthmatics' },
      cogn: { pct: 58, label: 'Moderate', detail: 'Ozone-precursor linked to headache, dizziness, and mental fatigue' },
    },
    so2: {
      cardio: { pct: 65, label: 'Moderate', detail: 'Reflex cardiovascular changes from acute autonomic stimulation' },
      resp: { pct: 95, label: 'Very High', detail: 'Immediate bronchoconstriction within minutes of inhalation' },
      cogn: { pct: 50, label: 'Moderate', detail: 'Sensory irritation and systemic stress responses during peak plumes' },
    },
    co: {
      cardio: { pct: 95, label: 'Very High', detail: 'Binds hemoglobin (carboxyhemoglobin), starving myocardial tissue of O₂' },
      resp: { pct: 75, label: 'High', detail: 'Impaired oxygen delivery across all pulmonary alveolar capillary beds' },
      cogn: { pct: 90, label: 'Very High', detail: 'Direct cerebral hypoxia causing impaired reflexes, confusion, and headache' },
    },
    o3: {
      cardio: { pct: 70, label: 'High', detail: 'Vascular oxidative stress and autonomic balance disruption' },
      resp: { pct: 98, label: 'Extreme', detail: 'Powerful cellular oxidant stripping protective epithelial lining fluids' },
      cogn: { pct: 64, label: 'Moderate', detail: 'Afternoon fatigue, ocular irritation, and exercise-induced coughing' },
    },
    nh3: {
      cardio: { pct: 55, label: 'Moderate', detail: 'Reflex airway responses affecting systemic vascular tone' },
      resp: { pct: 89, label: 'High', detail: 'Alkaline caustic gas irritating nasopharynx and bronchial mucosa' },
      cogn: { pct: 60, label: 'Moderate', detail: 'Upper respiratory distress inducing sensory discomfort and dizziness' },
    },
  };

  const profile = customImpacts || impactProfiles[pollutantId] || impactProfiles.pm25;

  return (
    <div className="visual-health-impact-matrix" id="visual-health-impact-matrix">
      <div className="impact-matrix-header">
        <div className="matrix-title-badge">
          <ShieldAlert size={14} style={{ color: accentColor }} />
          <span>PHYSIOLOGICAL VULNERABILITY MATRIX</span>
        </div>
        <div className="matrix-demographic-tabs" role="tablist" aria-label="Demographic View Switcher">
          <button
            type="button"
            className={`matrix-tab-btn ${activeDemographic === 'both' ? 'active' : ''}`}
            onClick={() => setActiveDemographic('both')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`matrix-tab-btn ${activeDemographic === 'children' ? 'active' : ''}`}
            onClick={() => setActiveDemographic('children')}
          >
            Pediatric
          </button>
          <button
            type="button"
            className={`matrix-tab-btn ${activeDemographic === 'adults' ? 'active' : ''}`}
            onClick={() => setActiveDemographic('adults')}
          >
            Adult
          </button>
        </div>
      </div>

      <div className="matrix-grid-layout">
        {/* LEFT PANEL: Organ System Impact Meters */}
        <div className="organ-vulnerability-deck">
          <div className="organ-deck-heading">
            <span className="deck-tag">TARGET SYSTEM INFILTRATION</span>
            <span className="deck-sub">{pollutantName} anatomical exposure severity</span>
          </div>

          <div className="organ-meter-row">
            <div className="organ-meter-meta">
              <span className="organ-label">
                <Heart size={14} className="organ-icon cardio" />
                <span>Cardiovascular</span>
              </span>
              <span className={`organ-severity-tag severity-${profile.cardio.label.toLowerCase().replace(' ', '-')}`}>
                {profile.cardio.label}
              </span>
            </div>
            <div className="organ-bar-track">
              <div
                className="organ-bar-fill cardio"
                style={{ width: `${profile.cardio.pct}%` }}
              />
            </div>
            <span className="organ-caption">{profile.cardio.detail}</span>
          </div>

          <div className="organ-meter-row">
            <div className="organ-meter-meta">
              <span className="organ-label">
                <Wind size={14} className="organ-icon resp" />
                <span>Respiratory & Pulmonary</span>
              </span>
              <span className={`organ-severity-tag severity-${profile.resp.label.toLowerCase().replace(' ', '-')}`}>
                {profile.resp.label}
              </span>
            </div>
            <div className="organ-bar-track">
              <div
                className="organ-bar-fill resp"
                style={{ width: `${profile.resp.pct}%` }}
              />
            </div>
            <span className="organ-caption">{profile.resp.detail}</span>
          </div>

          <div className="organ-meter-row">
            <div className="organ-meter-meta">
              <span className="organ-label">
                <Brain size={14} className="organ-icon cogn" />
                <span>Cognitive & Neurological</span>
              </span>
              <span className={`organ-severity-tag severity-${profile.cogn.label.toLowerCase().replace(' ', '-')}`}>
                {profile.cogn.label}
              </span>
            </div>
            <div className="organ-bar-track">
              <div
                className="organ-bar-fill cogn"
                style={{ width: `${profile.cogn.pct}%` }}
              />
            </div>
            <span className="organ-caption">{profile.cogn.detail}</span>
          </div>
        </div>

        {/* RIGHT PANEL: Demographic Sensitivity Comparison */}
        <div className="demographic-comparison-split">
          <div className="demo-panel-heading">
            <Users size={14} />
            <span>DEMOGRAPHIC SENSITIVITY COMPARISON</span>
          </div>

          <div className="demo-cards-wrapper">
            {(activeDemographic === 'both' || activeDemographic === 'children') && (
              <div className="demo-comparison-card children">
                <div className="demo-card-top">
                  <div className="demo-card-badge">
                    <Baby size={13} />
                    <span>CHILDREN</span>
                  </div>
                  <span className="demo-risk-pill high">2.5x Vulnerability</span>
                </div>
                <div className="demo-bullet-list">
                  <div className="demo-bullet-item">
                    <span className="demo-bullet-icon">🫁</span>
                    <div className="demo-bullet-text">
                      <strong>Higher Minute Ventilation:</strong> Inhales ~2.5x more air volume per kg body weight vs adults.
                    </div>
                  </div>
                  <div className="demo-bullet-item">
                    <span className="demo-bullet-icon">⚠</span>
                    <div className="demo-bullet-text">
                      <strong>Developing Pulmonary Tissues:</strong> 80% of alveolar air sacs form postnatally through adolescence.
                    </div>
                  </div>
                  <div className="demo-bullet-item">
                    <span className="demo-bullet-icon">📚</span>
                    <div className="demo-bullet-text">
                      <strong>Campus & Playground Risk:</strong> Peak outdoor PE & recess align with diurnal afternoon exposure.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeDemographic === 'both' || activeDemographic === 'adults') && (
              <div className="demo-comparison-card adults">
                <div className="demo-card-top">
                  <div className="demo-card-badge">
                    <Users size={13} />
                    <span>ADULTS</span>
                  </div>
                  <span className="demo-risk-pill moderate">Baseline Exposure</span>
                </div>
                <div className="demo-bullet-list">
                  <div className="demo-bullet-item">
                    <span className="demo-bullet-icon">🫁</span>
                    <div className="demo-bullet-text">
                      <strong>Mature Pulmonary Reserve:</strong> Fully formed alveolar surface area provides physiological buffer.
                    </div>
                  </div>
                  <div className="demo-bullet-item">
                    <span className="demo-bullet-icon">⚠</span>
                    <div className="demo-bullet-text">
                      <strong>Cumulative Cardiopulmonary Burden:</strong> Chronic endothelial stress elevates long-term hypertension risk.
                    </div>
                  </div>
                  <div className="demo-bullet-item">
                    <span className="demo-bullet-icon">💼</span>
                    <div className="demo-bullet-text">
                      <strong>Commute & Workplace Transit:</strong> Exposure concentrated during morning and evening rush-hour corridors.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
