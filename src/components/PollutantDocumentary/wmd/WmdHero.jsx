import React, { useCallback, useRef } from 'react';
import { Play, ScrollText } from 'lucide-react';
import HeroAtmosphericCanvas from '../HeroAtmosphericCanvas';
import { useAtmosphericMouseField } from '../useAtmosphericMouseField.js';
import { POLLUTANT_DOCUMENTARY_LIST } from '../../../data/pollutantDocumentaries.js';

/**
 * WmdHero - Atmospheric Editorial Hero Section
 * Implements strict GSAP animation hook contract (§6):
 * - id="documentary-hero-viewport"
 * - .documentary-hero-ambient-backdrop
 * - .documentary-hero-photo-layer
 * - .documentary-hero-haze-layer
 * - .documentary-pollutant-kicker-tag
 * - .documentary-pollutant-title-row > .documentary-pollutant-name (plain text for char splitting)
 * - .documentary-hero-headline
 * - .documentary-editorial-desc
 * - .documentary-hero-editorial-col
 * - .documentary-hero-spatial-col
 */
export default function WmdHero({
  pollutantData,
  cinematicTheme,
  weatherVariables,
}) {
  const heroRef = useRef(null);
  const mouseStateRef = useRef({ x: -1000, y: -1000, normX: 0, normY: 0, proximity: 0, active: false });
  // Cursor-reactive dust in the particle canvas (existing animation layer)
  useAtmosphericMouseField(heroRef, mouseStateRef);

  const chapterNumber = cinematicTheme?.chapterNum || '01';
  const totalCount = String(POLLUTANT_DOCUMENTARY_LIST.length).padStart(2, '0');
  const headline = pollutantData?.wmdTagline || pollutantData?.sections?.heroSubtitle || 'A SILENT KILLER';
  const description = pollutantData?.wmdIntro || pollutantData?.shortDescription || '';

  const handleWatchClick = useCallback(() => {
    const pinnedStory = document.getElementById('documentary-pinned-story') || document.querySelector('.documentary-pinned-story-section');
    if (pinnedStory) {
      pinnedStory.scrollIntoView({ behavior: 'smooth' });
    } else {
      const nextBand = document.getElementById('wmd-coverage-band');
      if (nextBand) nextBand.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleTranscriptClick = useCallback(() => {
    const section1 = document.getElementById('section-01-what-are-they') || document.querySelector('.documentary-section');
    if (section1) {
      section1.scrollIntoView({ behavior: 'smooth' });
    } else {
      const impact = document.getElementById('wmd-impact-row');
      if (impact) impact.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <section id="documentary-hero-viewport" className="wmd-hero documentary-hero" ref={heroRef}>
      {/* Layer 1: Ambient Backdrop Wrapper */}
      <div className="documentary-hero-ambient-backdrop">
        {/* Layer 2: Sepia Skyline Photo Layer */}
        <div
          className="documentary-hero-photo-layer wmd-photo wmd-hero__photo"
          style={{
            backgroundImage: 'url(/assets/documentary/delhi_photochemical_smog.webp)',
          }}
          aria-hidden="true"
        />

        {/* Layer 3: Organic Foliage Framing Masks */}
        <div className="wmd-hero__foliage-frame" aria-hidden="true" />

        {/* Layer 4: Warm Atmospheric Haze Gradient */}
        <div className="documentary-hero-haze-layer wmd-hero__haze" aria-hidden="true" />

        {/* Layer 5: Atmospheric Particle Flow Canvas */}
        <div className="wmd-hero__particles" aria-hidden="true">
          <HeroAtmosphericCanvas
            pollutantId={pollutantData.id}
            windSpeed={weatherVariables?.windSpeed}
            mouseStateRef={mouseStateRef}
          />
        </div>

        {/* Layer 6: Vignette & Text Scrim Gradient */}
        <div className="wmd-hero__vignette" aria-hidden="true" />
      </div>

      {/* Editorial Content Flow */}
      <div className="wmd-hero__container">
        {/* Left Column: Title, Kicker, Tagline, Editorial Body, and Actions */}
        <div className="documentary-hero-editorial-col wmd-hero__editorial">
          {/* Kicker Tag */}
          <div className="documentary-pollutant-kicker-tag wmd-hero__kicker">
            DOCUMENTARY {chapterNumber} / {totalCount}
          </div>

          {/* Main Title Row - plain text so GSAP splitText works */}
          <div className="documentary-pollutant-title-row wmd-hero__title-row">
            <h1 className="documentary-pollutant-name wmd-hero__title">
              {pollutantData.symbol}
            </h1>
          </div>

          {/* Tagline */}
          <h2 className="documentary-hero-headline wmd-hero__headline">
            {headline}
          </h2>

          {/* Editorial Paragraph */}
          <p className="documentary-editorial-desc wmd-hero__desc">
            {description}
          </p>

          {/* CTA Row: Watch Documentary */}
          <div className="wmd-hero__cta-row">
            <button
              type="button"
              className="wmd-hero__watch-pill"
              onClick={handleWatchClick}
              aria-label="Watch Documentary / Explore Story"
            >
              <span className="wmd-hero__play-disc">
                <Play size={20} className="wmd-hero__play-icon" />
              </span>
              <span className="wmd-hero__watch-label">WATCH DOCUMENTARY</span>
            </button>
          </div>

          {/* Transcript Trigger Row */}
          <div className="wmd-hero__transcript-row">
            <button
              type="button"
              className="wmd-hero__transcript-btn"
              onClick={handleTranscriptClick}
              aria-label="View Full Documentary Transcript and Science"
            >
              <span className="wmd-hero__transcript-icon-box">
                <ScrollText size={18} strokeWidth={1.25} />
              </span>
              <span className="wmd-hero__transcript-label">VIEW TRANSCRIPT</span>
            </button>
          </div>
        </div>

        {/* Right Column: Haiku Rule & Circular Inset Portal */}
        <div className="documentary-hero-spatial-col wmd-hero__spatial">
          <div className="wmd-hero__quote-wrapper">
            <div className="wmd-hero__vertical-rule" />
            <div className="wmd-hero__quote-text">
              INVISIBLE<br />
              PARTICLES.<br />
              REAL<br />
              CONSEQUENCES.
            </div>
          </div>

          {/* Circular Foliage Inset cropped at viewport border */}
          <div className="wmd-hero__circle-portal-container" aria-hidden="true">
            <div className="wmd-hero__circle-outer-ring" />
            <div
              className="wmd-hero__circle-portal wmd-photo"
              style={{
                backgroundImage: 'url(/assets/documentary/wmd/wmd_foliage_circle.webp)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
