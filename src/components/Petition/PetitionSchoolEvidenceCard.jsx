import React from 'react';
import { Calendar } from 'lucide-react';

/**
 * Renders the 14-Day School Continuous Monitoring Evidence Section
 * showing observed/partial/missing coverage, average PM2.5, peak metrics,
 * and daily observation logs with strict spatial estimation disclaimers.
 */
export default function PetitionSchoolEvidenceCard({ activeEvidencePackage }) {
  if (!activeEvidencePackage) return null;

  return (
    <div
      id="school-evidence-section"
      style={{
        padding: '16px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 8px 32px rgba(56, 189, 248, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} />
          <span>14-Day School Monitoring Evidence</span>
        </span>
        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', fontWeight: 700 }}>
          {`${activeEvidencePackage.coverage?.observedDays ?? 14} / ${activeEvidencePackage.coverage?.daysInWindow ?? 14} Days Verified (${activeEvidencePackage.coverage?.coveragePercent ?? 100}%)`}
        </span>
      </div>

      {/* 4-Item Metrics Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div style={{ fontSize: '0.62rem', color: '#34d399', fontWeight: 600 }}>OBSERVED DAYS</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>
            {activeEvidencePackage.coverage?.observedDays ?? 14} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ 14</span>
          </div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <div style={{ fontSize: '0.62rem', color: '#fbbf24', fontWeight: 600 }}>PARTIAL DAYS</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>
            {activeEvidencePackage.coverage?.partialDays ?? 0}
          </div>
        </div>

        <div style={{ background: 'rgba(100, 116, 139, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>MISSING DAYS</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#cbd5e1' }}>
            {activeEvidencePackage.coverage?.missingDays ?? 0}
          </div>
        </div>

        <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <div style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: 600 }}>14-DAY AVG PM2.5</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
            {activeEvidencePackage.summary?.averagePm25 ?? '--'} <span style={{ fontSize: '0.65rem' }}>µg/m³</span>
          </div>
          <div style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 500 }}>Estimated around school</div>
        </div>
      </div>

      {/* Range & Peak Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '10px', padding: '6px 10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', flexWrap: 'wrap', gap: '6px' }}>
        <span>Period: <strong>{activeEvidencePackage.monitoringPeriod?.startDate} to {activeEvidencePackage.monitoringPeriod?.endDate}</strong></span>
        <span>Highest Day: <strong>{activeEvidencePackage.summary?.highestDailyPm25 ?? '--'} µg/m³</strong></span>
        <span>Lowest Day: <strong>{activeEvidencePackage.summary?.lowestDailyPm25 ?? '--'} µg/m³</strong></span>
      </div>

      {/* Daily Evidence Timeline */}
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
        DAILY OBSERVATION LOG:
      </div>
      <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '6px', background: 'rgba(0, 0, 0, 0.3)' }}>
        {(activeEvidencePackage.dailyEvidence || []).map((day, idx) => (
          <div
            key={day.date || idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px',
              borderBottom: idx < activeEvidencePackage.dailyEvidence.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
              fontSize: '0.7rem',
            }}
          >
            <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{day.date}</span>
            <span style={{
              padding: '1px 6px',
              borderRadius: '4px',
              fontSize: '0.6rem',
              fontWeight: 700,
              background: day.status === 'OBSERVED' ? 'rgba(16, 185, 129, 0.15)' : day.status === 'PARTIAL' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)',
              color: day.status === 'OBSERVED' ? '#34d399' : day.status === 'PARTIAL' ? '#fbbf24' : '#94a3b8',
            }}>
              {day.status}
            </span>
            <span style={{ color: '#94a3b8' }}>
              {day.observationCount ? `${day.observationCount} obs` : '0 obs'}
            </span>
            <span style={{ color: day.status !== 'NO_DATA' && day.averagePm25 !== null ? '#f8fafc' : '#64748b', fontWeight: 600 }}>
              {day.status !== 'NO_DATA' && day.averagePm25 !== null ? `${day.averagePm25} µg/m³ (Estimated)` : 'NO DATA'}
            </span>
          </div>
        ))}
      </div>

      {/* Mandatory Spatial Estimation Methodology Disclaimer */}
      <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '8px', lineHeight: '1.4' }}>
        School PM2.5 values are spatial estimates derived from nearby monitoring stations and are not direct measurements at the school.
      </div>
    </div>
  );
}
