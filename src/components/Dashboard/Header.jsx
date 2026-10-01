import React from 'react';
import { Wind, CloudLightning, Database, Bot, Cpu, Layers } from 'lucide-react';

export default function Header({ onOpenAwsModal, awsTelemetry }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-glass)',
        background: 'rgba(9, 13, 22, 0.8)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
          }}
        >
          <Wind size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              VayuVitals 3D
            </h1>
            <span className="badge badge-tour">Bharat Builds · Event 02</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Real-Time Environmental Digital Twin on AWS (S3 · API Gateway · Lambda · DynamoDB · Bedrock)
          </p>
        </div>
      </div>

      {/* Action / AWS Architecture Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onOpenAwsModal}
          className="btn-secondary"
          style={{
            borderColor: 'rgba(255, 153, 0, 0.35)',
            background: 'rgba(255, 153, 0, 0.08)',
            color: '#ffb74d',
          }}
          title="Inspect live AWS request pipeline and telemetry"
        >
          <CloudLightning size={16} color="#ff9900" />
          <span>AWS Architecture Pipeline</span>
          <span
            style={{
              fontSize: '0.7rem',
              background: '#232f3e',
              color: '#38bdf8',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {awsTelemetry?.region || 'ap-south-1'}
          </span>
        </button>
      </div>
    </header>
  );
}
