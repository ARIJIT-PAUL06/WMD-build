import React from 'react';
import { Cpu, RefreshCw, AlertTriangle, Clock } from 'lucide-react';

/**
 * Renders the Step 1b: AWS SageMaker Grid Model Forecasting Card
 * with tomorrow morning arrival alert banner, 48h school operating windows,
 * predicted outdoor safety windows, and annexure inclusion toggle.
 */
export default function PetitionForecastCard({
  forecast,
  isLoadingForecast,
  fetchForecast,
  includeForecastInDossier,
  setIncludeForecastInDossier
}) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '14px',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(6, 182, 212, 0.35)',
        boxShadow: '0 8px 32px rgba(6, 182, 212, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22d3ee'
            }}
          >
            <Cpu size={15} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Step 1b: AWS SageMaker Grid Model
            </span>
            <span
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.62rem',
                fontWeight: 600,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              {forecast?.gridBlock?.gridId ? `${forecast.gridBlock.gridId} · SageMaker Active` : 'AWS SageMaker Live'}
            </span>
          </div>
        </div>
        <button
          onClick={fetchForecast}
          disabled={isLoadingForecast}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={12} className={isLoadingForecast ? 'animate-spin' : ''} />
          Re-forecast
        </button>
      </div>

      {forecast ? (
        <div>
          {/* Tomorrow Morning Peak Risk Alert Banner */}
          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: forecast.peakMorningArrival?.severeAlert
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(127, 29, 29, 0.3) 100%)'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.2) 100%)',
              border: forecast.peakMorningArrival?.severeAlert
                ? '1px solid rgba(239, 68, 68, 0.4)'
                : '1px solid rgba(245, 158, 11, 0.35)',
              marginBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={15} color={forecast.peakMorningArrival?.severeAlert ? '#ef4444' : '#f59e0b'} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: forecast.peakMorningArrival?.severeAlert ? '#fca5a5' : '#fde68a', textTransform: 'uppercase' }}>
                  Tomorrow Morning Arrival Risk Alert (07:00 - 09:00 AM)
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: forecast.peakMorningArrival?.color,
                  color: '#fff'
                }}
              >
                {forecast.peakMorningArrival?.category}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                {forecast.peakMorningArrival?.predictedPm25} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>µg/m³</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                Peak at <strong>{forecast.peakMorningArrival?.time}</strong> ({forecast.peakMorningArrival?.date})
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#f1f5f9', marginTop: '4px', lineHeight: '1.4' }}>
              <strong>Action Directive:</strong> {forecast.preEmptiveRecommendation}
            </div>
          </div>

          {/* 48h School Operating Windows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>DAY 1 SCHOOL (07-13h)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>
                {forecast.morningWindows?.day1?.avg || '---'} µg/m³ <span style={{ fontSize: '0.65rem', fontWeight: 400, color: '#94a3b8' }}>avg</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>
                Peak: <strong>{forecast.morningWindows?.day1?.peak} µg/m³</strong> ({forecast.morningWindows?.day1?.peakHour})
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>DAY 2 SCHOOL (07-13h)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>
                {forecast.morningWindows?.day2?.avg || '---'} µg/m³ <span style={{ fontSize: '0.65rem', fontWeight: 400, color: '#94a3b8' }}>avg</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>
                Peak: <strong>{forecast.morningWindows?.day2?.peak} µg/m³</strong> ({forecast.morningWindows?.day2?.peakHour})
              </div>
            </div>
          </div>

          {/* Outdoor Activities Timing & Regional Pattern Guidance */}
          {forecast.outdoorActivityGuidance && (
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={12} />
                <span>PREDICTED OUTDOOR SAFETY WINDOWS (TODAY)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>AVOID OUTDOORS:</span>
                  <span><strong>{forecast.outdoorActivityGuidance.morningArrivalRisk?.window}</strong> (Arrival Inversion Trap)</span>
                </div>
                {forecast.outdoorActivityGuidance.noonRecessRisk?.alertRequired && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>AVOID FIELD SPORTS:</span>
                    <span><strong>{forecast.outdoorActivityGuidance.noonRecessRisk?.window}</strong> (Recess Accumulation)</span>
                  </div>
                )}
                {forecast.outdoorActivityGuidance.safeWindows?.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>SAFEST VENTILATION:</span>
                    <span><strong>{forecast.outdoorActivityGuidance.safeWindows[0]?.start} - {forecast.outdoorActivityGuidance.safeWindows[0]?.end}</strong> (Solar Dispersion)</span>
                  </div>
                )}
              </div>
              {forecast.regionalHistoricalInsight && (
                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  {forecast.regionalHistoricalInsight}
                </div>
              )}
            </div>
          )}

          {/* Model Validation & Inclusion Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              Model: <strong style={{ color: '#38bdf8' }}>{forecast.modelName || 'wmd-grid-3yr-daily-xgboost-v1'}</strong> · MAE: <strong style={{ color: '#34d399' }}>{forecast.maeError || '3.19'} µg/m³</strong>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#e2e8f0' }}>
              <input
                type="checkbox"
                checked={includeForecastInDossier}
                onChange={(e) => setIncludeForecastInDossier(e.target.checked)}
                style={{ accentColor: '#06b6d4', width: '14px', height: '14px' }}
              />
              <span>Include in Dossier (Annexure B)</span>
            </label>
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
          Calculating AWS SageMaker 48-hour forward projection...
        </div>
      )}
    </div>
  );
}
