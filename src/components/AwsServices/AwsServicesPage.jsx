import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import StatsGrain from '../Stats/StatsGrain';
import AppFooter from '../Footer/AppFooter';
import {
  AWS_SERVICES_CATALOG,
  CATEGORIES,
  CATEGORY_LABELS,
  ARCHITECTURE_LANES,
} from '../../data/awsServicesCatalog';
import '../Stats/StatsPage.css';
import './AwsServicesPage.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * ServiceCard
 * Renders an authentic AWS service entry with title, purpose,
 * bounded bullets, configuration string, and repository source path.
 */
function ServiceCard({ service }) {
  const categoryLabel = CATEGORY_LABELS[service.category] || service.category;

  return (
    <article
      className="aws-card"
      id={`aws-service-${service.id}`}
      aria-label={`${service.name} details`}
    >
      <div className="aws-card-top">
        <span className="aws-card-tag">{categoryLabel}</span>
        <span className="aws-card-region">{service.region}</span>
      </div>

      <h3 className="aws-card-name">{service.name}</h3>
      <p className="aws-card-purpose">{service.purpose}</p>

      <ul className="aws-card-bullets" aria-label="Usage details">
        {service.usedFor.map((bullet, idx) => (
          <li key={idx}>{bullet}</li>
        ))}
      </ul>

      <dl className="aws-card-meta">
        <div className="aws-card-meta-item">
          <dt>CONFIG</dt>
          <dd>{service.config}</dd>
        </div>
        <div className="aws-card-meta-item">
          <dt>EVIDENCE</dt>
          <dd>
            <code>{service.source}</code>
          </dd>
        </div>
      </dl>
    </article>
  );
}

/**
 * ArchitectureFlow
 * Renders the two architecture lanes as ordered HTML lists with directional connectors.
 */
function ArchitectureFlow({ lanes }) {
  return (
    <div className="aws-arch-flow">
      {lanes.map((lane, laneIdx) => (
        <div key={lane.id} className="aws-arch-lane">
          <div className="aws-arch-lane-header">
            <span className="aws-arch-lane-badge">LANE 0{laneIdx + 1}</span>
            <h3 className="aws-arch-lane-title">{lane.title}</h3>
            <span className="aws-arch-lane-sub">{lane.subtitle}</span>
          </div>

          <ol className="aws-arch-steps" aria-label={lane.title}>
            {lane.steps.map((step, stepIdx) => (
              <li key={step.step} className="aws-arch-node">
                {stepIdx < lane.steps.length - 1 && (
                  <span className="aws-arch-connector" aria-hidden="true" />
                )}
                <span className="aws-arch-step-num">0{step.step}</span>
                <h4 className="aws-arch-step-title">{step.title}</h4>
                <div className="aws-arch-step-service">{step.service}</div>
                <p className="aws-arch-step-detail">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

/**
 * AwsServicesPage
 * Full-page architectural catalog showcasing the 12 AWS services in production.
 * Designed in complete visual parity with the VayuVitals Stats page.
 */
export default function AwsServicesPage({ onBack, onOpenDashboard }) {
  const pageRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('all');

  // Enforce scroll reset when mounting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, []);

  // GSAP ScrollTrigger section header reveals
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (!prefersReducedMotion) {
        const sections = gsap.utils.toArray('.stats-section');
        sections.forEach((sec) => {
          const header = sec.querySelector('.stats-section-header');
          if (header) {
            gsap.from(header, {
              scrollTrigger: {
                trigger: sec,
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
              opacity: 0,
              y: 22,
              duration: 0.85,
              ease: 'power2.out',
            });
          }
        });
      }
    }, pageRef);

    return () => {
      ctx.revert();
    };
  }, []);

  // Filter change recalculates page height; refresh ScrollTrigger triggers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => window.cancelAnimationFrame(id);
  }, [activeCategory]);

  // Back navigation matching StatsPage contract
  const handleGoBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      const hasHistory = window.history.length > 1;
      if (hasHistory) {
        window.history.back();
        setTimeout(() => {
          const currentUrl = new URL(window.location);
          if (
            currentUrl.searchParams.get('page') === 'aws-services' ||
            currentUrl.searchParams.get('view') === 'aws-services' ||
            currentUrl.hash === '#aws'
          ) {
            if (onBack) {
              onBack();
            } else {
              currentUrl.searchParams.delete('page');
              currentUrl.searchParams.delete('view');
              currentUrl.hash = '';
              window.history.pushState({}, '', currentUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }
        }, 120);
        return;
      }
    }

    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('page');
      url.searchParams.delete('view');
      url.hash = '';
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onBack]);

  // Filter tabs definition derived from categories
  const filterTabs = useMemo(() => {
    const tabs = [{ id: 'all', label: `All (${AWS_SERVICES_CATALOG.length})` }];
    for (const cat of CATEGORIES) {
      const count = AWS_SERVICES_CATALOG.filter((s) => s.category === cat).length;
      tabs.push({
        id: cat,
        label: `${CATEGORY_LABELS[cat] || cat} (${count})`,
      });
    }
    return tabs;
  }, []);

  // Filtered services
  const filteredServices = useMemo(() => {
    if (activeCategory === 'all') return AWS_SERVICES_CATALOG;
    return AWS_SERVICES_CATALOG.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="stats-page aws-page" id="aws-services-page-root" ref={pageRef}>
      {/* Laboratory Coordinate Grid & Film Grain */}
      <div className="stats-laboratory-grid-bg" aria-hidden="true">
        <StatsGrain />
      </div>

      {/* Top-Left Circular Return Button */}
      <div className="stats-back-button-root">
        <button
          type="button"
          className="stats-back-button"
          onClick={handleGoBack}
          aria-label="Navigate Back"
        >
          <ArrowLeft className="stats-back-icon" />
        </button>
        <div className="stats-back-tooltip" role="tooltip">Return</div>
      </div>

      <main className="stats-content-wrapper">
        {/* ================================================================= */}
        {/* BAND 1: HERO — CLOUD STACK METRICS STRIP                          */}
        {/* ================================================================= */}
        <section className="stats-hero-section" id="aws-hero" aria-label="AWS Cloud Stack Overview">

          <div className="stats-instrument-header">
            <div className="stats-telemetry-meta">
              <span className="stats-inst-id">00 / PRODUCTION ARCHITECTURE</span>
              <h1 className="stats-inst-name">AWS Services</h1>
              <p className="stats-transparency-body" style={{ maxWidth: '65ch', marginTop: '10px' }}>
                Twelve production AWS services powering VayuVitals atmospheric research, machine learning forecasting, and civic notifications. Sourced directly from implementation files and CloudFormation templates.
              </p>
            </div>
            <div className="stats-inst-ref-tag">
              {`${AWS_SERVICES_CATALOG.length} VERIFIED SERVICES`}
            </div>
          </div>

          {/* Metric Strip (Open Editorial Strip, 4 Columns) */}
          <div className="stats-hero-metrics-strip" aria-label="Cloud Overview Metrics">
            <div className="stats-metric-cell">
              <span className="stats-metric-label">ACTIVE SERVICES</span>
              <div className="stats-metric-value">{AWS_SERVICES_CATALOG.length}</div>
              <span className="stats-metric-sub">Verified in codebase & SAM template</span>
            </div>

            <div className="stats-metric-cell">
              <span className="stats-metric-label">PRIMARY REGION</span>
              <div className="stats-metric-value" style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)' }}>
                ap-south-1
              </div>
              <span className="stats-metric-sub">Mumbai (ap-south-1) · SES in us-east-1</span>
            </div>

            <div className="stats-metric-cell">
              <span className="stats-metric-label">INFRASTRUCTURE DOMAINS</span>
              <div className="stats-metric-value">{CATEGORIES.length}</div>
              <span className="stats-metric-sub">Compute, Data, ML/AI, Identity, Messaging, Ops</span>
            </div>

            <div className="stats-metric-cell">
              <span className="stats-metric-label">AUTHENTICITY STANDARD</span>
              <div className="stats-metric-value" style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)' }}>
                100% REAL
              </div>
              <span className="stats-metric-sub">Zero simulated endpoints, mocks or fake latencies</span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* BAND 2: PARCHMENT — END-TO-END ARCHITECTURE FLOW                  */}
        {/* ================================================================= */}
        <section
          className="stats-section stats-section--parchment"
          id="aws-architecture"
          aria-label="Architecture Flow"
        >
          <div className="stats-section-header">
            <div>
              <span className="stats-section-tag">01 / END-TO-END FLOW</span>
              <h2 className="stats-section-headline">Request &amp; Monitor Orchestration</h2>
            </div>
            <span className="stats-section-coord">TWO VERIFIED OPERATIONAL PIPELINES</span>
          </div>

          <ArchitectureFlow lanes={ARCHITECTURE_LANES} />
        </section>

        {/* ================================================================= */}
        {/* BAND 3: DEEP BAND — 12-SERVICE CATALOGUE                          */}
        {/* ================================================================= */}
        <section
          className="stats-section stats-section--deep"
          id="aws-catalog"
          aria-label="Service Catalogue"
        >
          <div className="stats-section-header">
            <div>
              <span className="stats-section-tag">02 / PRODUCTION STACK</span>
              <h2 className="stats-section-headline">Twelve Production Services</h2>
            </div>
            <span className="stats-section-coord">
              {`${filteredServices.length} OF ${AWS_SERVICES_CATALOG.length} SERVICES DISPLAYED`}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="stats-filter-controls-row">
            <div
              className="stats-filter-pill-group"
              role="tablist"
              aria-label="Filter AWS Services by Category"
            >
              {filterTabs.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`aws-tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls="aws-catalog-grid"
                    className={`stats-filter-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveCategory(tab.id)}
                  >
                    {isActive && (
                      <motion.div
                        className="stats-filter-pill-bg"
                        layoutId="awsFilterPill"
                        transition={{ type: 'spring', bounce: 0.18, duration: 0.3 }}
                      />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="stats-filter-caption">FILTER BY DOMAIN</span>
          </div>

          {/* Responsive Cards Grid */}
          <div
            className="aws-cards-grid"
            id="aws-catalog-grid"
            role="tabpanel"
            aria-labelledby={`aws-tab-${activeCategory}`}
          >
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* BAND 4: TECHNICAL TRANSPARENCY & FOOTER                           */}
        {/* ================================================================= */}
        <section className="stats-footer-section" id="aws-footer" aria-label="Technical Lineage">
          <div className="stats-transparency-grid">
            <div className="stats-transparency-card">
              <span className="stats-transparency-tag">AUTHENTICITY STANDARD</span>
              <h3 className="stats-transparency-title">Zero-Faking Directive</h3>
              <p className="stats-transparency-body">
                Every service listed is backed by actual code or SAM templates. No mock latencies, phantom cloud status badges, or synthetic responses exist in VayuVitals.
              </p>
            </div>

            <div className="stats-transparency-card">
              <span className="stats-transparency-tag">SECURITY BOUNDARY</span>
              <h3 className="stats-transparency-title">Least-Privilege IAM</h3>
              <p className="stats-transparency-body">
                Lambda functions execute under tightly scoped execution roles granting access solely to specific DynamoDB tables, SageMaker endpoints, and Bedrock models.
              </p>
            </div>

            <div className="stats-transparency-card">
              <span className="stats-transparency-tag">INFRASTRUCTURE LINEAGE</span>
              <h3 className="stats-transparency-title">Reproducible SAM Stack</h3>
              <p className="stats-transparency-body">
                The entire cloud infrastructure is codified in aws/template.yaml and deployed via audited CloudFormation change sets with rollback capabilities.
              </p>
            </div>
          </div>

          <div className="stats-footer-metadata-grid">
            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">PRIMARY REGION</span>
              <span className="stats-footer-meta-val">ap-south-1</span>
              <span className="stats-footer-meta-sub">Asia Pacific (Mumbai)</span>
            </div>

            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">COMPUTE ENGINE</span>
              <span className="stats-footer-meta-val">AWS Lambda</span>
              <span className="stats-footer-meta-sub">Node.js 22 (512 MB · 180s)</span>
            </div>

            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">ML SERVING</span>
              <span className="stats-footer-meta-val">Amazon SageMaker</span>
              <span className="stats-footer-meta-sub">Serverless XGBoost 1.7-1</span>
            </div>

            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">TEMPLATE SPEC</span>
              <span className="stats-footer-meta-val">aws/template.yaml</span>
              <span className="stats-footer-meta-sub">AWS SAM / CloudFormation</span>
            </div>

            <div className="stats-footer-meta-col">
              <span className="stats-footer-meta-label">VERIFIED SERVICES</span>
              <span className="stats-footer-meta-val">{`${AWS_SERVICES_CATALOG.length} IN USE`}</span>
              <span className="stats-footer-meta-sub">Zero-Faking Directive Verified</span>
            </div>
          </div>
        </section>
      </main>

      {/* Shared VayuVitals Environmental Intelligence Footer */}
      <AppFooter
        currentRoute="aws-services"
        onHome={onBack}
        onMap={onOpenDashboard}
        onStats={() => {
          if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            url.searchParams.delete('view');
            url.searchParams.set('page', 'stats');
            window.history.pushState({}, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }}
        onAbout={() => {
          if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            url.searchParams.delete('view');
            url.searchParams.set('page', 'about');
            window.history.pushState({}, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }}
        onBackToCargo={() => {
          if (onBack) onBack();
          if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            url.searchParams.delete('page');
            url.hash = '#pollutants';
            window.history.pushState({}, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
            setTimeout(() => {
              const el = document.getElementById('atmospheric-cargo-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }
        }}
      />
    </div>
  );
}
