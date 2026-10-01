import React from 'react';
import { MapPin, Sparkles } from 'lucide-react';

const POPULAR_CITIES = [
  { name: 'Delhi (DTU / Bawana)', isVenue: true },
  { name: 'Delhi (Anand Vihar)', isHotspot: true },
  { name: 'Delhi (Connaught Place)' },
  { name: 'Mumbai' },
  { name: 'Bengaluru' },
  { name: 'Kolkata' },
  { name: 'Chennai' },
  { name: 'Hyderabad' },
];

export default function CitySelector({ selectedCity, onSelectCity, isLoading }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <MapPin size={14} color="#38bdf8" />
          <span>Monitor Urban Basin</span>
        </label>
        {isLoading && (
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', animation: 'pulseGlow 1s infinite' }} />
            Syncing AWS Lambda...
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}
      >
        {POPULAR_CITIES.map((c) => {
          const isSelected = selectedCity === c.name;
          return (
            <button
              key={c.name}
              onClick={() => onSelectCity(c.name)}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: isSelected ? 600 : 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: isSelected
                  ? '1px solid #10b981'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected
                  ? 'rgba(16, 185, 129, 0.18)'
                  : 'rgba(30, 41, 59, 0.5)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: isSelected ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {c.isVenue && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    background: '#ff9900',
                    color: '#000000',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  DTU VENUE
                </span>
              )}
              {c.isHotspot && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    background: '#ef4444',
                    color: '#ffffff',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  HIGH AQI
                </span>
              )}
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
