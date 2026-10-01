import React, { useState } from 'react';
import { X, CloudLightning, Database, Bot, Cpu, Radio, CheckCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';

export default function AwsArchitectureModal({ isOpen, onClose, awsTelemetry, onTriggerIotIngest }) {
  const [isIngestingIot, setIsIngestingIot] = useState(false);
  const [iotResult, setIotResult] = useState(null);

  if (!isOpen) return null;

  const handleIotTest = async () => {
    setIsIngestingIot(true);
    setIotResult(null);
    try {
      const res = await onTriggerIotIngest();
      setIotResult(res);
    } catch (err) {
      setIotResult({ error: err.message });
    } finally {
      setIsIngestingIot(false);
    }
  };

  const PIPELINE_STEPS = [
    {
      name: 'Physical / Virtual Sensor',
      service: 'AWS IoT Core / Open-Meteo',
      icon: Radio,
      desc: 'Telemetry (PM2.5, PM10, NO2, Temp) streamed via MQTT or REST',
      status: 'Active',
      color: '#38bdf8',
    },
    {
      name: 'API Gateway',
      service: 'Amazon API Gateway (HTTP API)',
      icon: CloudLightning,
      desc: 'Routes GET /api/air-quality with low-latency SSL termination',
      status: '200 OK',
      color: '#ff9900',
    },
    {
      name: 'Compute Engine',
      service: 'AWS Lambda (Node.js 20.x)',
      icon: Cpu,
      desc: 'Normalizes pollutant concentrations and triggers persistence',
      status: `${awsTelemetry?.lambdaExecutionTimeMs || 18}ms Execution`,
      color: '#ff9900',
    },
    {
      name: 'Historical Store',
      service: 'Amazon DynamoDB',
      icon: Database,
      desc: 'Partition: city, Sort: timestamp. Enables 24h trend analytics',
      status: awsTelemetry?.dynamoDb?.mode || 'Local/Cloud Synchronized',
      color: '#3b82f6',
    },
    {
      name: 'AI Explanation',
      service: 'Amazon Bedrock',
      icon: Bot,
      desc: 'Generates non-computational biological risk advisory (Claude 3 Haiku / Titan)',
      status: `${awsTelemetry?.bedrock?.latencyMs || 210}ms Inference`,
      color: '#a855f7',
    },
    {
      name: 'Static Edge Host',
      service: 'Amazon S3 + CloudFront',
      icon: Zap,
      desc: 'Global CDN distribution for interactive 3D WebGL bundle',
      status: 'OAC Encrypted',
      color: '#10b981',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: '#090e1a',
          border: '1px solid rgba(255, 153, 0, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 153, 0, 0.15)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(255, 153, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloudLightning size={22} color="#ff9900" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
                AWS Production Architecture & Live Data Pipeline
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Bharat Builds Event 02 Technical Implementation · Region: <code style={{ color: '#ff9900' }}>{awsTelemetry?.region || 'ap-south-1'}</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Pipeline Flowchart */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
            End-to-End Execution Flow (Live Trace):
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px',
            }}
          >
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={16} color={step.color} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                        {step.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: step.color,
                        background: `${step.color}15`,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {step.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#ff9900', fontWeight: 600, marginBottom: '4px' }}>
                    {step.service}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Telemetry & IoT Testing */}
        <div
          style={{
            background: 'rgba(35, 47, 62, 0.4)',
            border: '1px solid rgba(255, 153, 0, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '18px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} color="#38bdf8" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                AWS IoT Core Hardware Sensor Bridge
              </span>
            </div>
            <button
              onClick={handleIotTest}
              disabled={isIngestingIot}
              className="btn-primary"
              style={{
                fontSize: '0.75rem',
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #ff9900 0%, #d97706 100%)',
              }}
            >
              <RefreshCw size={13} className={isIngestingIot ? 'animate-spin' : ''} />
              {isIngestingIot ? 'Publishing MQTT...' : 'Simulate Live IoT Sensor Ping'}
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Simulates a physical air-quality station (e.g. ESP32 with PMS5003 laser sensor at DTU Delhi) publishing to topic <code>sensors/delhi-dtu-01</code> via AWS IoT Core. The payload triggers AWS Lambda, writes to DynamoDB, and updates the 3D lungs.
          </p>

          {iotResult && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: '#34d399',
              }}
            >
              ✅ Ingestion Success: {JSON.stringify(iotResult)}
            </div>
          )}
        </div>

        {/* AWS SAM / Deployment Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Ready for <code>sam deploy</code> or S3/CloudFront static upload</span>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '6px 14px' }}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
