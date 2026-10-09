import React, { useState } from 'react';
import { Bot, Sparkles, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

export default function BedrockAdvisoryCard({
  advisory,
  aqi,
  status,
  dominantPollutant,
  onRegenerate,
  isLoading,
  modelId = 'anthropic.claude-3-haiku-20240307-v1:0',
}) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await onRegenerate();
    setIsRegenerating(false);
  };

  const isSevere = aqi > 150;
  const isGood = aqi <= 50;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        border: isSevere
          ? '1px solid rgba(239, 68, 68, 0.4)'
          : isGood
          ? '1px solid rgba(16, 185, 129, 0.3)'
          : '1px solid var(--border-glass)',
      }}
    >
      {/* Background Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '100%',
          background: isSevere
            ? 'radial-gradient(circle at right, rgba(239, 68, 68, 0.12), transparent 70%)'
            : isGood
            ? 'radial-gradient(circle at right, rgba(16, 185, 129, 0.12), transparent 70%)'
            : 'radial-gradient(circle at right, rgba(245, 158, 11, 0.1), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 153, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={18} color="#ff9900" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                Amazon Bedrock Health Synthesis
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {modelId}
            </span>
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={isLoading || isRegenerating}
          className="btn-secondary"
          style={{ padding: '5px 10px', fontSize: '0.75rem' }}
          title="Invoke Bedrock to re-synthesize environmental explanation"
        >
          <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
          {isRegenerating ? 'Synthesizing...' : 'Refresh'}
        </button>
      </div>

      {/* Advisory Text */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          marginBottom: '14px',
          fontSize: '0.88rem',
          lineHeight: '1.55',
          color: '#f1f5f9',
        }}
      >
        {isLoading || isRegenerating ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
            <Sparkles size={16} color="#ff9900" className="animate-spin" />
            <span>Generating tailored pulmonary risk explanation via Amazon Bedrock...</span>
          </div>
        ) : (
          advisory || 'No Bedrock advisory available. (Live AWS Bedrock model unconfigured or unauthorized)'
        )}
      </div>

      {/* Key Takeaways Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(30, 41, 59, 0.4)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
          }}
        >
          {isSevere ? (
            <ShieldAlert size={16} color="#ef4444" />
          ) : (
            <CheckCircle2 size={16} color="#10b981" />
          )}
          <div>
            <div style={{ color: 'var(--text-muted)' }}>School Commutes:</div>
            <div style={{ fontWeight: 600, color: isSevere ? '#fca5a5' : '#86efac' }}>
              {isSevere ? 'N95 Respirator Required' : 'Open Air Safe'}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(30, 41, 59, 0.4)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
          }}
        >
          <Sparkles size={16} color="#38bdf8" />
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Dominant Driver:</div>
            <div style={{ fontWeight: 600, color: '#ffffff' }}>
              {dominantPollutant || 'PM2.5'} Aerosols
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
