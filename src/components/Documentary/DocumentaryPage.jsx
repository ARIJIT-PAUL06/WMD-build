import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  ChevronRight,
  Microscope,
  Globe,
  FlaskConical,
  BookOpen,
  BarChart3,
  AlertTriangle,
  Film,
  Clock,
  Zap,
} from 'lucide-react';
import { POLLUTANTS_DATA } from '../../data/pollutantsDetailData';
import './DocumentaryPage.css';

/* ─── Chapter config per documentary ───────────────────────────── */
function buildChapters(doc, pollutant) {
  return [
    {
      id: 'cold-open',
      label: 'Cold Open',
      icon: Film,
      title: doc.title,
      type: 'cold-open',
    },
    {
      id: 'context',
      label: 'The Setting',
      icon: Globe,
      title: 'Atmospheric Context',
      type: 'context',
    },
    {
      id: 'investigation',
      label: 'Investigation',
      icon: Microscope,
      title: 'Field Investigation',
      type: 'investigation',
    },
    {
      id: 'science',
      label: 'Science',
      icon: FlaskConical,
      title: 'The Science',
      type: 'science',
    },
    {
      id: 'finding',
      label: 'Key Finding',
      icon: Zap,
      title: 'Critical Discovery',
      type: 'finding',
    },
    {
      id: 'takeaway',
      label: 'Takeaway',
      icon: BookOpen,
      title: 'What This Means',
      type: 'takeaway',
    },
  ];
}

/* ─── Cinematic narrative generator from doc data ───────────────── */
function buildNarrative(doc, pollutant) {
  return {
    'cold-open': {
      scene: 'INT. MONITORING STATION — 02:47 AM',
      lines: [
        `The instruments never sleep.`,
        `Somewhere in the dark above ${pollutant.name === 'Carbon Monoxide' ? 'the gridlocked highway' : 'the city'}, the sensors are already recording what the morning newspapers will struggle to explain.`,
        `This is the story of ${doc.title}.`,
      ],
      pullquote: null,
    },
    context: {
      scene: 'EXT. INDO-GANGETIC PLAIN — WINTER DAWN',
      lines: [
        `${pollutant.name} (${pollutant.symbol}) sits at the intersection of chemistry and consequence. At ${pollutant.naaqs24h} ${pollutant.unit}, India draws a legal line. The WHO draws a harder one at ${pollutant.whoGuideline} ${pollutant.unit}.`,
        `Delhi's winter peak reaches ${pollutant.delhiPeakSmog} ${pollutant.unit} — ${Math.round(pollutant.delhiPeakSmog / pollutant.whoGuideline)}× beyond what the world's leading health body considers safe.`,
        `The primary emission sources tell a complicated story of urban density, agricultural necessity, and industrial inertia colliding inside a geographic basin designed by geology to trap everything that enters it.`,
      ],
      pullquote: `"${Math.round(pollutant.delhiPeakSmog / pollutant.whoGuideline)}× the WHO safe limit. Every winter. Every year."`,
    },
    investigation: {
      scene: 'FIELD INVESTIGATION — NCR SENSOR TRAVERSE',
      lines: [
        doc.summary,
        `The investigation required ${doc.duration.split(' ')[0] > 15 ? 'extensive' : 'careful'} field coordination. Producer: ${doc.producer}.`,
        `What the instruments captured redefined the conventional understanding of ${pollutant.name} behavior in a megacity environment. The data was unambiguous, even when the causes were not.`,
      ],
      pullquote: null,
    },
    science: {
      scene: 'LAB ANALYSIS — ATMOSPHERIC CHEMISTRY',
      lines: [
        `${pollutant.lungsImpact.pathology}`,
        `The target site: the ${pollutant.lungsImpact.pulmonaryRegion}. The primary clinical manifestations documented across exposed populations include persistent patterns that align with the biochemical infiltration pathway.`,
        `Understanding the mechanism is not academic. It is the difference between policy that performs and policy that protects.`,
      ],
      pullquote: `"The body keeps a record of every breath it takes."`,
    },
    finding: {
      scene: 'ANALYSIS COMPLETE — KEY TELEMETRY INSIGHT',
      lines: [
        `After weeks of data collection and laboratory analysis, one finding crystallised above all others.`,
        `${doc.keyTakeaway}`,
        `This was not a model prediction or a simulation extrapolation. It was a direct measurement. Sensor-verified. Peer-reviewed. Reproducible.`,
      ],
      pullquote: `"${doc.keyTakeaway}"`,
    },
    takeaway: {
      scene: 'EPILOGUE — WHAT CHANGES NOW',
      lines: [
        `The findings from this investigation feed directly into the urgent necessity for evidence-based intervention. Science without application is a library locked at midnight.`,
        `${pollutant.countermeasures.map((c) => c.title).join(', ')} — these are not abstract recommendations. They are engineering specifications drawn from hard data.`,
        `The air does not negotiate. Neither should the response.`,
      ],
      pullquote: null,
    },
  };
}

export default function DocumentaryPage({ docId, pollutantId, onBack }) {
  const pollutant = POLLUTANTS_DATA[pollutantId] || POLLUTANTS_DATA.pm25;
  const doc = pollutant.documentaries.find((d) => d.id === docId) || pollutant.documentaries[0];
  const { theme } = pollutant;

  const chapters = buildChapters(doc, pollutant);
  const narrative = buildNarrative(doc, pollutant);

  const [activeChapter, setActiveChapter] = useState('cold-open');
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealedLines, setRevealedLines] = useState({});
  const [filmGrainSeed] = useState(() => Math.random());

  const chapterRefs = useRef({});
  const observerRef = useRef(null);

  /* ── Scrollspy via IntersectionObserver ──────────────────────── */
  useEffect(() => {
    const targets = Object.values(chapterRefs.current).filter(Boolean);
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveChapter(entry.target.dataset.chapter);
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    targets.forEach((el) => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  /* ── Staggered text reveal on scroll into view (IO fallback) ── */
  /* Only needed for browsers without native CSS scroll-driven animations */
  useEffect(() => {
    // Skip if native CSS animation-timeline is supported — CSS handles it
    if (CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) return;

    const lineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const key = entry.target.dataset.linekey;
            if (key) {
              setRevealedLines((prev) => ({ ...prev, [key]: true }));
            }
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('[data-linekey]').forEach((el) => lineObserver.observe(el));
    return () => lineObserver.disconnect();
  }, []); // ← run once on mount only

  const scrollToChapter = useCallback((id) => {
    const el = chapterRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const themeStyles = {
    '--doc-primary': theme.primary,
    '--doc-secondary': theme.secondary,
    '--doc-glow': theme.accentGlow,
    '--doc-card-bg': theme.cardBg,
    '--doc-card-border': theme.cardBorder,
    '--doc-badge': theme.badgeColor,
  };

  return (
    <div className="doc-page-root" style={themeStyles}>
      {/* ── Film grain overlay ─── */}
      <div
        className="doc-film-grain"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${Math.floor(filmGrainSeed * 99)}' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")` }}
        aria-hidden="true"
      />

      {/* ── Ambient glow ─── */}
      <div className="doc-ambient-glow" aria-hidden="true" />

      {/* ── Letterbox bars ─── */}
      <div className="doc-letterbox-top" aria-hidden="true" />
      <div className="doc-letterbox-bottom" aria-hidden="true" />

      {/* ════════════════════════════════════════════════════════════
          STICKY CHAPTER RAIL (left sidebar on desktop)
          ════════════════════════════════════════════════════════════ */}
      <nav className="doc-chapter-rail" aria-label="Documentary chapters">
        <div className="doc-rail-back">
          <button onClick={onBack} className="doc-back-btn" title="Back to pollutant page">
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>

        <div className="doc-rail-meta">
          <span className="doc-rail-symbol" style={{ color: theme.primary }}>
            {pollutant.symbol}
          </span>
          <span className="doc-rail-label">Documentary</span>
        </div>

        <ol className="doc-chapter-list" role="list">
          {chapters.map((ch, i) => {
            const Icon = ch.icon;
            const isActive = activeChapter === ch.id;
            return (
              <li key={ch.id}>
                <button
                  className={`doc-chapter-btn ${isActive ? 'active' : ''}`}
                  onClick={() => scrollToChapter(ch.id)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="doc-chapter-num">{String(i + 1).padStart(2, '0')}</span>
                  <Icon size={13} className="doc-chapter-icon" />
                  <span className="doc-chapter-label">{ch.label}</span>
                  {isActive && <ChevronRight size={12} className="doc-chapter-arrow" />}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Runtime pill */}
        <div className="doc-rail-runtime">
          <Clock size={12} />
          <span>{doc.duration}</span>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════
          MAIN SCROLL CONTENT
          ════════════════════════════════════════════════════════════ */}
      <main className="doc-main-scroll">

        {/* ── CINEMATIC HERO ─── */}
        <section
          className="doc-hero-section"
          ref={(el) => { chapterRefs.current['cold-open'] = el; }}
          data-chapter="cold-open"
        >
          <div className="doc-hero-inner">
            <div className="doc-hero-top-bar">
              <span className="doc-hero-badge">
                <Film size={12} />
                Field Documentary · {doc.producer}
              </span>
              <span className="doc-hero-duration">
                <Clock size={12} />
                {doc.duration}
              </span>
            </div>

            <div className="doc-hero-pollutant-tag" style={{ color: theme.primary }}>
              {pollutant.symbol} — {pollutant.name}
            </div>

            <h1 className="doc-hero-title">{doc.title}</h1>

            <p className="doc-hero-summary">{doc.summary}</p>

            <button
              className="doc-play-btn"
              onClick={() => { setIsPlaying(!isPlaying); scrollToChapter('context'); }}
              aria-label="Begin reading documentary"
            >
              <div className="doc-play-icon-wrap">
                <Play size={18} fill="currentColor" />
              </div>
              <span>{isPlaying ? 'Continue Reading' : 'Begin Documentary'}</span>
            </button>
          </div>

          {/* Aspect-ratio scanner line */}
          <div className="doc-scanner-line" aria-hidden="true" />

          {/* Corner annotations */}
          <span className="doc-corner doc-corner-tl" aria-hidden="true">REC ●</span>
          <span className="doc-corner doc-corner-tr" aria-hidden="true">{pollutant.delhiPeakSmog} {pollutant.unit}</span>
          <span className="doc-corner doc-corner-bl" aria-hidden="true">FIELD STUDY</span>
          <span className="doc-corner doc-corner-br" aria-hidden="true">{doc.id.toUpperCase()}</span>
        </section>

        {/* ── NARRATIVE CHAPTERS ─── */}
        {chapters.slice(1).map((chapter, chIdx) => {
          const narr = narrative[chapter.id];
          if (!narr) return null;
          const Icon = chapter.icon;

          return (
            <section
              key={chapter.id}
              className="doc-chapter-section"
              ref={(el) => { chapterRefs.current[chapter.id] = el; }}
              data-chapter={chapter.id}
            >
              {/* Chapter header band */}
              <div className="doc-chapter-header">
                <div className="doc-chapter-pill">
                  <Icon size={13} />
                  <span>Chapter {chIdx + 2}</span>
                </div>
                <h2 className="doc-chapter-title">{chapter.title}</h2>
                <div className="doc-scene-slug">{narr.scene}</div>
              </div>

              {/* Narrative body */}
              <div className="doc-chapter-body">
                {/* Lines */}
                <div className="doc-narrative-lines">
                  {narr.lines.map((line, lineIdx) => {
                    const key = `${chapter.id}-line-${lineIdx}`;
                    const revealed = revealedLines[key];
                    return (
                      <p
                        key={lineIdx}
                        className={`doc-narrative-line ${revealed ? 'revealed' : ''}`}
                        data-linekey={key}
                        style={{ transitionDelay: `${lineIdx * 0.08}s` }}
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>

                {/* Pull-quote */}
                {narr.pullquote && (
                  <blockquote
                    className="doc-pullquote"
                    style={{
                      borderLeftColor: theme.primary,
                    }}
                  >
                    {narr.pullquote}
                  </blockquote>
                )}

                {/* Data inset panels injected per chapter */}
                {chapter.id === 'context' && (
                  <div className="doc-data-inset">
                    <div className="doc-data-inset-label">
                      <BarChart3 size={13} />
                      Concentration Reference
                    </div>
                    <div className="doc-data-bars">
                      {[
                        { label: 'WHO Guideline', value: pollutant.whoGuideline, color: '#10b981', max: pollutant.delhiPeakSmog },
                        { label: 'India NAAQS', value: pollutant.naaqs24h, color: '#fbbf24', max: pollutant.delhiPeakSmog },
                        { label: 'Delhi Peak', value: pollutant.delhiPeakSmog, color: '#ef4444', max: pollutant.delhiPeakSmog },
                      ].map((bar) => (
                        <div key={bar.label} className="doc-data-bar-row">
                          <span className="doc-data-bar-label">{bar.label}</span>
                          <div className="doc-data-bar-track">
                            <div
                              className="doc-data-bar-fill"
                              style={{
                                width: `${(bar.value / bar.max) * 100}%`,
                                background: bar.color,
                              }}
                            />
                          </div>
                          <span className="doc-data-bar-val" style={{ color: bar.color }}>
                            {bar.value} {pollutant.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {chapter.id === 'investigation' && (
                  <div className="doc-data-inset">
                    <div className="doc-data-inset-label">
                      <Globe size={13} />
                      Primary Emission Sources
                    </div>
                    <div className="doc-source-grid">
                      {pollutant.sources.map((s, i) => (
                        <div key={i} className="doc-source-item">
                          <div className="doc-source-top">
                            <span className="doc-source-name">{s.name}</span>
                            <span className="doc-source-pct" style={{ color: theme.primary }}>{s.pct}%</span>
                          </div>
                          <div className="doc-source-bar-track">
                            <div
                              className="doc-source-bar-fill"
                              style={{
                                width: `${s.pct}%`,
                                background: `linear-gradient(90deg, ${theme.secondary}, ${theme.primary})`,
                              }}
                            />
                          </div>
                          <p className="doc-source-desc">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {chapter.id === 'science' && (
                  <div className="doc-data-inset">
                    <div className="doc-data-inset-label">
                      <AlertTriangle size={13} />
                      Clinical Symptom Profile
                    </div>
                    <div className="doc-symptoms-list">
                      {pollutant.lungsImpact.symptoms.map((s, i) => (
                        <div key={i} className="doc-symptom-row">
                          <span
                            className="doc-symptom-bullet"
                            style={{ background: theme.primary }}
                          />
                          {s}
                        </div>
                      ))}
                    </div>
                    <div
                      className="doc-severity-tag"
                      style={{ borderColor: theme.cardBorder, color: theme.primary }}
                    >
                      {pollutant.lungsImpact.severityTag}
                    </div>
                  </div>
                )}

                {chapter.id === 'finding' && (
                  <div className="doc-finding-card" style={{ borderColor: doc.accent || theme.primary }}>
                    <div className="doc-finding-label" style={{ color: doc.accent || theme.primary }}>
                      Key Telemetry Insight
                    </div>
                    <p className="doc-finding-text">{doc.keyTakeaway}</p>
                  </div>
                )}

                {chapter.id === 'takeaway' && (
                  <div className="doc-countermeasures">
                    {pollutant.countermeasures.map((c, i) => (
                      <div key={i} className="doc-countermeasure-item">
                        <div
                          className="doc-countermeasure-title"
                          style={{ color: theme.primary }}
                        >
                          {c.title}
                        </div>
                        <p className="doc-countermeasure-rule">{c.rule}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chapter divider */}
              <div className="doc-chapter-divider" aria-hidden="true">
                <span className="doc-divider-line" style={{ background: `linear-gradient(90deg, transparent, ${theme.primary}, transparent)` }} />
                <span className="doc-divider-label" style={{ color: theme.primary }}>
                  {String(chIdx + 2).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}
                </span>
              </div>
            </section>
          );
        })}

        {/* ── END CARD ─── */}
        <section className="doc-end-card">
          <div className="doc-end-inner">
            <div className="doc-end-symbol" style={{ color: theme.primary }}>
              {pollutant.symbol}
            </div>
            <h2 className="doc-end-title">End of Documentary</h2>
            <p className="doc-end-credit">{doc.producer}</p>
            <p className="doc-end-subtitle">
              {doc.title}
            </p>
            <button className="doc-end-back-btn" onClick={onBack}>
              <ArrowLeft size={15} />
              Return to {pollutant.symbol} Intelligence Profile
            </button>
          </div>
        </section>
      </main>

      {/* ── MOBILE CHAPTER DRAWER (bottom rail) ─── */}
      <div className="doc-mobile-rail" role="navigation" aria-label="Chapter navigation">
        {chapters.map((ch) => {
          const Icon = ch.icon;
          const isActive = activeChapter === ch.id;
          return (
            <button
              key={ch.id}
              className={`doc-mobile-ch-btn ${isActive ? 'active' : ''}`}
              onClick={() => scrollToChapter(ch.id)}
              aria-current={isActive ? 'step' : undefined}
            >
              <Icon size={16} />
              <span>{ch.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
