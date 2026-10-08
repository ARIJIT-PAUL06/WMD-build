import React, { useState } from 'react';
import { Layers, Wind, Activity, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

/**
 * ConnectedProcessFlow
 * Replaces linear text blocks with an animated connected-node pipeline.
 * Features glowing signal lines, interactive stage activation,
 * and responsive horizontal-to-vertical layout.
 */
export default function ConnectedProcessFlow({
  stages = [],
  title = 'ATMOSPHERIC TRANSPORT PIPELINE',
  subtitle = 'The continuous physical journey from emission injection to receptor inhalation',
  accentColor = '#10b981',
}) {
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  // Fallback default stages if none provided
  const defaultStages = [
    {
      step: '01',
      stage: 'Injection',
      detail: 'Combustion tailpipes and industrial boilers eject primary plumes into the surface canopy.',
      tag: 'Source Vector',
    },
    {
      step: '02',
      stage: 'Thermal Buoyancy',
      detail: 'Warm flue gases rise; horizontal pressure gradients disperse aerosols across neighborhoods.',
      tag: 'Advection',
    },
    {
      step: '03',
      stage: 'Inversion Ceiling',
      detail: 'Winter radiative cooling locks pollutants beneath a compressed 150m boundary ceiling.',
      tag: 'Trapping',
    },
    {
      step: '04',
      stage: 'Secondary Smog',
      detail: 'Gaseous precursors react photochemically in stagnant air to synthesize new particulate mass.',
      tag: 'Chemistry',
    },
    {
      step: '05',
      stage: 'Inhalation Exposure',
      detail: 'Aerosols descend into human breathing zones and regulatory monitoring receptors.',
      tag: 'Deposition',
    },
  ];

  const flowStages = stages.length > 0 ? stages : defaultStages;

  return (
    <div className="connected-process-flow-container" id="connected-process-flow">
      <div className="flow-header-row">
        <div>
          <span className="flow-kicker">
            <Layers size={13} style={{ color: accentColor }} />
            <span>{title}</span>
          </span>
          <p className="flow-subtitle">{subtitle}</p>
        </div>
        <div className="flow-step-counter">
          STAGE <strong>{flowStages[activeStageIdx]?.step || '01'}</strong> / {String(flowStages.length).padStart(2, '0')}
        </div>
      </div>

      {/* Connected Nodes Pathway */}
      <div className="flow-pipeline-track" role="list">
        {/* Continuous glowing path bar behind nodes */}
        <div className="flow-pipeline-line" aria-hidden="true">
          <div
            className="flow-pipeline-progress"
            style={{
              width: `${(activeStageIdx / (flowStages.length - 1)) * 100}%`,
              background: `linear-gradient(90deg, #10b981, ${accentColor})`,
            }}
          />
        </div>

        {flowStages.map((stg, idx) => {
          const isActive = idx === activeStageIdx;
          const isPassed = idx < activeStageIdx;

          return (
            <div
              key={stg.step || idx}
              role="listitem"
              className={`flow-node-item ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
              onClick={() => setActiveStageIdx(idx)}
              onMouseEnter={() => setActiveStageIdx(idx)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveStageIdx(idx);
                }
              }}
              aria-label={`Stage ${stg.step}: ${stg.stage}`}
            >
              {/* Node Orb with Pulsing Glow */}
              <div
                className="flow-node-orb"
                style={{
                  '--node-accent': accentColor,
                }}
              >
                <span className="node-num">{stg.step}</span>
                {isActive && <div className="node-pulse-ring" />}
              </div>

              {/* Node Label Block */}
              <div className="flow-node-content">
                <span className="flow-node-title">{stg.stage}</span>
                <span className="flow-node-tag">{stg.tag || `Phase ${stg.step}`}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Stage Deep-Dive Card */}
      {flowStages[activeStageIdx] && (
        <div className="flow-stage-active-dossier">
          <div className="dossier-left">
            <span className="dossier-phase-badge">
              STEP {flowStages[activeStageIdx].step} · {flowStages[activeStageIdx].tag || 'ATMOSPHERIC PROCESS'}
            </span>
            <h4 className="dossier-stage-name">{flowStages[activeStageIdx].stage}</h4>
            <p className="dossier-stage-detail">
              {flowStages[activeStageIdx].detail}
            </p>
          </div>
          <div className="dossier-right">
            <div className="dossier-nav-actions">
              <button
                type="button"
                className="dossier-nav-btn prev"
                disabled={activeStageIdx === 0}
                onClick={() => setActiveStageIdx((i) => Math.max(0, i - 1))}
                aria-label="Previous stage"
              >
                ← Prev
              </button>
              <button
                type="button"
                className="dossier-nav-btn next"
                disabled={activeStageIdx === flowStages.length - 1}
                onClick={() => setActiveStageIdx((i) => Math.min(flowStages.length - 1, i + 1))}
                aria-label="Next stage"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
