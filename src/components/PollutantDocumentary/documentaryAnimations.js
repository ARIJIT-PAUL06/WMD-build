/**
 * documentaryAnimations.js
 * VayuVitals - GSAP & ScrollTrigger Cinematic Animation Engine
 *
 * Scoped exclusively to the seven pollutant documentary pages:
 * PM2.5, PM10, NO2, SO2, CO, O3, NH3.
 *
 * Inspired by the cinematic interaction and motion language of Forge Automotive:
 * - Real Indian vehicles as visual protagonists (large visual subjects, camera-like parallax)
 * - Oversized typography choreography and independent multi-layer depth
 * - Pinned ScrollTrigger narrative moments ("WHAT IS IT?", "WHERE DOES IT EMERGE?", "WHY DOES IT MATTER?")
 * - Dedicated Vehicle Showcase Atelier with scroll-driven tracking and real-time live data HUD reveals
 * - Masked clip-path image reveals and film-cut transitions
 * - 100% React lifecycle safe with gsap.context() and total ScrollTrigger cleanup
 * - Zero global style contamination; respects prefers-reduced-motion and mobile ergonomics
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Pollutant-specific motion personality parameters
 */
export const POLLUTANT_MOTION_PERSONALITIES = {
  pm25: {
    ease: 'power2.out',
    durationMultiplier: 1.15,
    heroScaleStart: 1.12,
    staggerDelay: 0.12,
    accentGlowDuration: 2.4,
    descriptor: 'Dense Atmospheric Suspension',
  },
  pm10: {
    ease: 'power3.out',
    durationMultiplier: 0.95,
    heroScaleStart: 1.08,
    staggerDelay: 0.09,
    accentGlowDuration: 1.8,
    descriptor: 'Coarse Particulate Mechanical Friction',
  },
  no2: {
    ease: 'expo.out',
    durationMultiplier: 0.9,
    heroScaleStart: 1.1,
    staggerDelay: 0.08,
    accentGlowDuration: 1.6,
    descriptor: 'Combustion Traffic Plume',
  },
  so2: {
    ease: 'power2.inOut',
    durationMultiplier: 1.1,
    heroScaleStart: 1.09,
    staggerDelay: 0.11,
    accentGlowDuration: 2.2,
    descriptor: 'Thermal & Industrial Kiln Flue',
  },
  co: {
    ease: 'sine.out',
    durationMultiplier: 1.25,
    heroScaleStart: 1.06,
    staggerDelay: 0.14,
    accentGlowDuration: 2.8,
    descriptor: 'Silent Incomplete Combustion',
  },
  o3: {
    ease: 'power1.out',
    durationMultiplier: 1.05,
    heroScaleStart: 1.14,
    staggerDelay: 0.1,
    accentGlowDuration: 2.0,
    descriptor: 'Solar Photochemical Expansion',
  },
  nh3: {
    ease: 'power2.out',
    durationMultiplier: 1.0,
    heroScaleStart: 1.08,
    staggerDelay: 0.1,
    accentGlowDuration: 2.1,
    descriptor: 'Agricultural Alkaline Synthesis',
  },
};

/**
 * Initialize all GSAP and ScrollTrigger animations for the current pollutant documentary.
 * Scoped strictly to containerEl using gsap.context().
 *
 * @param {HTMLElement} containerEl - Root element of the pollutant documentary (.cinematic-pollutant-documentary)
 * @param {string} pollutantId - 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3' | 'nh3'
 * @returns {Function} cleanup - Function to revert animations and kill ScrollTriggers
 */
export function setupDocumentaryAnimations(containerEl, pollutantId = 'pm25') {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !containerEl) {
    return () => {};
  }

  // 1. Enforce scroll reset to top (scrollY = 0) immediately before measuring DOM bounding rects
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;

  // 2. Clear GSAP ScrollTrigger cached scroll memory to prevent unexpected scroll position restoration
  try {
    if (typeof ScrollTrigger.clearScrollMemory === 'function') {
      ScrollTrigger.clearScrollMemory();
    }
  } catch (err) {
    // Safe no-op in test/non-browser environment
  }

  const personality =
    POLLUTANT_MOTION_PERSONALITIES[pollutantId] || POLLUTANT_MOTION_PERSONALITIES.pm25;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isMobile = window.innerWidth <= 768;

  // Use gsap.context to ensure every selector is scoped to containerEl
  const ctx = gsap.context((self) => {
    // ------------------------------------------------------------------------
    // REDUCED MOTION SAFEGUARD: Instant clean reveal without transforms/pins
    // ------------------------------------------------------------------------
    if (prefersReducedMotion) {
      gsap.set(
        [
          '.doc-forge-hero-section',
          '.doc-forge-vehicle-img',
          '.doc-forge-oversized-symbol',
          '.doc-forge-headline',
          '.doc-forge-hud-card',
          '.doc-pinned-story-section',
          '.doc-pinned-card',
          '.doc-forge-showcase-section',
          '.showcase-vehicle-image',
          '.showcase-live-hud-panel',
          '.specs-panel-frame',
          '.cinematic-spread-grid',
          '.cinematic-scale-visual-deck',
          '.cinematic-source-frame',
          '.cinematic-weather-telemetry-strip',
          '.cinematic-transport-flow-card',
          '.cinematic-live-hero-readout',
          '.cinematic-station-node-card',
          '.cinematic-school-dossier-card',
          '.cinematic-impact-point-card',
          '.cinematic-day-frame',
          '.cinematic-closing-line',
          '.cinematic-chapter-chip',
        ],
        { opacity: 1, clearProps: 'transform,clipPath' }
      );
      return;
    }

    // ========================================================================
    // 1. VEHICLE HERO ANIMATION (Forge Automotive Protagonist Experience)
    // ========================================================================
    const heroSection = self.selector('#doc-forge-hero')[0];
    const heroVehicleImg = self.selector('.doc-forge-vehicle-img')[0];
    const heroHaze = self.selector('.doc-forge-haze-layer')[0];
    const heroKicker = self.selector('.doc-forge-kicker-badge')[0];
    const heroCoords = self.selector('.doc-forge-coordinates')[0];
    const heroSymbol = self.selector('.doc-forge-oversized-symbol')[0];
    const heroHeadline = self.selector('.doc-forge-headline')[0];
    const heroLead = self.selector('.doc-forge-lead')[0];
    const heroHudCards = self.selector('.doc-forge-hud-card');
    const scrollIndicator = self.selector('.doc-forge-scroll-indicator')[0];

    const tlHero = gsap.timeline({
      defaults: { ease: personality.ease },
    });

    if (heroVehicleImg) {
      tlHero.fromTo(
        heroVehicleImg,
        { scale: personality.heroScaleStart, opacity: 0.85, y: 15 },
        { scale: 1.02, opacity: 1, y: 0, duration: 1.5 * personality.durationMultiplier }
      );
    }

    if (heroHaze) {
      tlHero.fromTo(
        heroHaze,
        { opacity: 0, scale: 0.95 },
        { opacity: 0.85, scale: 1, duration: 2.0 },
        '-=1.6'
      );
    }

    if (heroKicker) {
      tlHero.fromTo(
        heroKicker,
        { y: -25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        '-=1.4'
      );
    }

    if (heroCoords) {
      tlHero.fromTo(
        heroCoords,
        { y: -15, opacity: 0 },
        { y: 0, opacity: 0.85, duration: 0.7 },
        '-=1.1'
      );
    }

    if (heroSymbol) {
      tlHero.fromTo(
        heroSymbol,
        { y: 70, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 1.15 * personality.durationMultiplier },
        '-=0.9'
      );
    }

    if (heroHeadline) {
      tlHero.fromTo(
        heroHeadline,
        { y: 35, opacity: 0, clipPath: 'inset(100% 0 0 0)' },
        { y: 0, opacity: 1, clipPath: 'inset(0% 0 0 0)', duration: 0.95 },
        '-=0.8'
      );
    }

    if (heroLead) {
      tlHero.fromTo(
        heroLead,
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        '-=0.6'
      );
    }

    if (heroHudCards && heroHudCards.length > 0) {
      tlHero.fromTo(
        heroHudCards,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, stagger: 0.1 },
        '-=0.5'
      );
    }

    if (scrollIndicator) {
      tlHero.fromTo(
        scrollIndicator,
        { opacity: 0, y: 12 },
        { opacity: 0.9, y: 0, duration: 0.7 },
        '-=0.3'
      );
    }

    // Scroll-driven Hero Camera Motion:
    // Vehicle moves slowly, image scales subtly, typography drifts independently
    if (heroSection && heroVehicleImg && !isMobile) {
      // Vehicle slow forward camera push & slight lateral tracking
      gsap.to(heroVehicleImg, {
        scale: 1.08,
        yPercent: 18,
        xPercent: 3,
        ease: 'none',
        scrollTrigger: {
          trigger: heroSection,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });

      // Foreground typography moves upward faster (camera parallax separation)
      const heroOverlay = self.selector('.doc-forge-hero-overlay')[0];
      if (heroOverlay) {
        gsap.to(heroOverlay, {
          yPercent: -22,
          opacity: 0.1,
          ease: 'none',
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: '85% top',
            scrub: true,
          },
        });
      }
    }

    // ========================================================================
    // 2. PINNED STORY SCENE (ScrollTrigger Pinned Narrative Moment)
    // ========================================================================
    const pinnedSection = self.selector('#doc-pinned-story-scene')[0];
    const pinnedCanvas = self.selector('.doc-pinned-bg-canvas')[0];
    const pinnedImg = self.selector('.doc-pinned-bg-img')[0];
    const pinnedCards = self.selector('.doc-pinned-card');
    const stepIndicators = self.selector('.step-indicator');

    if (pinnedSection && pinnedCards && pinnedCards.length >= 3 && !isMobile) {
      // Pinned timeline driving sequential narrative beats
      const pinTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: pinnedSection,
          start: 'top top',
          end: '+=180%',
          pin: true,
          scrub: 0.7,
        },
      });

      // Background subtle zoom & contrast shift during scroll
      if (pinnedImg) {
        pinTimeline.to(pinnedImg, {
          scale: 1.08,
          ease: 'none',
          duration: 3,
        }, 0);
      }

      // Initial state: Card 0 is visible, Cards 1 & 2 are hidden
      gsap.set(pinnedCards[0], { opacity: 1, y: 0, pointerEvents: 'auto' });
      gsap.set([pinnedCards[1], pinnedCards[2]], {
        opacity: 0,
        y: 50,
        pointerEvents: 'none',
        clipPath: 'inset(100% 0 0 0)',
      });
      if (stepIndicators[0]) stepIndicators[0].classList.add('active');

      // Beat 0 -> Beat 1 transition
      pinTimeline
        .to(pinnedCards[0], {
          opacity: 0,
          y: -40,
          clipPath: 'inset(0 0 100% 0)',
          duration: 0.8,
          onStart: () => {
            if (stepIndicators[0]) stepIndicators[0].classList.add('active');
            if (stepIndicators[1]) stepIndicators[1].classList.remove('active');
          },
        }, 0.6)
        .to(pinnedCards[1], {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0% 0 0% 0)',
          pointerEvents: 'auto',
          duration: 0.8,
          onStart: () => {
            if (stepIndicators[0]) stepIndicators[0].classList.remove('active');
            if (stepIndicators[1]) stepIndicators[1].classList.add('active');
          },
        }, 1.0);

      // Beat 1 -> Beat 2 transition
      pinTimeline
        .to(pinnedCards[1], {
          opacity: 0,
          y: -40,
          clipPath: 'inset(0 0 100% 0)',
          duration: 0.8,
          onStart: () => {
            if (stepIndicators[1]) stepIndicators[1].classList.add('active');
            if (stepIndicators[2]) stepIndicators[2].classList.remove('active');
          },
        }, 1.8)
        .to(pinnedCards[2], {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0% 0 0% 0)',
          pointerEvents: 'auto',
          duration: 0.8,
          onStart: () => {
            if (stepIndicators[1]) stepIndicators[1].classList.remove('active');
            if (stepIndicators[2]) stepIndicators[2].classList.add('active');
          },
        }, 2.2);
    } else if (pinnedCards && pinnedCards.length > 0) {
      // Mobile / non-pin fallback: stagger cards cleanly
      gsap.fromTo(
        pinnedCards,
        { opacity: 0, y: 35 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          scrollTrigger: {
            trigger: pinnedSection || pinnedCards[0],
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }

    // ========================================================================
    // 3. CINEMATIC SOURCE EXPOSURE (Atmospheric Source & Live Receptor Telemetry)
    // ========================================================================
    const exposureSection =
      self.selector('#doc-source-exposure-scene')[0] ||
      self.selector('#doc-vehicle-showcase-scene')[0];
    const exposureImg =
      self.selector('.exposure-vehicle-image')[0] ||
      self.selector('.showcase-vehicle-image')[0];
    const exposureStatementCol =
      self.selector('.exposure-statement-col')[0] ||
      self.selector('.showcase-identity-col')[0];
    const exposureTelemetryCol =
      self.selector('.exposure-telemetry-col')[0] ||
      self.selector('.showcase-specs-col')[0];
    const exposureBehaviorBox = self.selector('.exposure-behavior-box')[0];
    const naaqsProgressFill =
      self.selector('.naaqs-progress-fill')[0] ||
      self.selector('.naaqs-fill')[0];
    const measurementNum =
      self.selector('.measurement-number')[0] ||
      self.selector('.readout-val')[0];

    if (exposureSection) {
      // Horizontal vehicle tracking across viewport during scroll
      if (exposureImg && !isMobile) {
        gsap.fromTo(
          exposureImg,
          { xPercent: -4, scale: 1.0 },
          {
            xPercent: 4,
            scale: 1.06,
            ease: 'none',
            scrollTrigger: {
              trigger: exposureSection,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
            },
          }
        );
      }

      // Entrance animation for Statement & Atmospheric column
      if (exposureStatementCol) {
        gsap.fromTo(
          exposureStatementCol,
          { opacity: 0, x: -35 },
          {
            opacity: 1,
            x: 0,
            duration: 0.9,
            ease: personality.ease,
            scrollTrigger: {
              trigger: exposureSection,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Entrance animation for Telemetry card column
      if (exposureTelemetryCol) {
        gsap.fromTo(
          exposureTelemetryCol,
          { opacity: 0, x: 35 },
          {
            opacity: 1,
            x: 0,
            duration: 0.9,
            ease: personality.ease,
            scrollTrigger: {
              trigger: exposureSection,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Atmospheric behavior box entrance
      if (exposureBehaviorBox) {
        gsap.fromTo(
          exposureBehaviorBox,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: personality.ease,
            scrollTrigger: {
              trigger: exposureSection,
              start: 'top 65%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // NAAQS fill progress bar reveal
      if (naaqsProgressFill) {
        gsap.fromTo(
          naaqsProgressFill,
          { transformOrigin: 'left center', scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.2,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: exposureSection,
              start: 'top 70%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Live measurement number text-shadow glow
      if (measurementNum) {
        gsap.fromTo(
          measurementNum,
          { textShadow: '0 0 10px rgba(255,255,255,0.1)' },
          {
            textShadow: '0 0 35px var(--pollutant-glow, rgba(239, 68, 68, 0.45))',
            duration: personality.accentGlowDuration,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          }
        );
      }
    }

    // ========================================================================
    // 4. CHAPTER 01: THE INVISIBLE PARTICLES (Clip-path photographic wipe)
    // ========================================================================
    const sec01 = self.selector('#section-01-what-are-they')[0];
    if (sec01) {
      const textCol = sec01.querySelector('.cinematic-spread-text-col');
      const photoSpread = sec01.querySelector('.cinematic-torn-photo-spread');
      const photoImg = sec01.querySelector('.cinematic-photo-base');

      if (textCol) {
        gsap.fromTo(
          textCol.children,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.08,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec01,
              start: 'top 78%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (photoSpread && photoImg) {
        gsap.fromTo(
          photoSpread,
          { opacity: 0, y: 40, clipPath: 'inset(15% 0 15% 0)' },
          {
            opacity: 1,
            y: 0,
            clipPath: 'inset(0% 0 0% 0)',
            duration: 1.15 * personality.durationMultiplier,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec01,
              start: 'top 72%',
              toggleActions: 'play none none reverse',
            },
          }
        );

        if (!isMobile) {
          gsap.fromTo(
            photoImg,
            { scale: 1.09 },
            {
              scale: 1.0,
              ease: 'none',
              scrollTrigger: {
                trigger: sec01,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            }
          );
        }
      }
    }

    // ========================================================================
    // 5. CHAPTER 02: PHYSICAL SCALE COMPARISON (Dynamic bar expansion)
    // ========================================================================
    const sec02 = self.selector('#section-02-how-small')[0];
    if (sec02) {
      const scaleHeader = sec02.querySelector('.cinematic-scale-header');
      const scaleDiagram = sec02.querySelector('.cinematic-proportional-diagram');
      const scaleBars = sec02.querySelectorAll('.cinematic-scale-bar-row');
      const barFills = sec02.querySelectorAll('.bar-fill');

      if (scaleHeader) {
        gsap.fromTo(
          scaleHeader.children,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.08,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec02,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (scaleDiagram) {
        gsap.fromTo(
          scaleDiagram,
          { opacity: 0, scale: 0.88 },
          {
            opacity: 1,
            scale: 1,
            duration: 1.0 * personality.durationMultiplier,
            ease: 'back.out(1.2)',
            scrollTrigger: {
              trigger: scaleDiagram,
              start: 'top 82%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (barFills && barFills.length > 0) {
        gsap.fromTo(
          barFills,
          { transformOrigin: 'left center', scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.1,
            stagger: 0.1,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec02.querySelector('.cinematic-scale-bars-board') || sec02,
              start: 'top 78%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (scaleBars && scaleBars.length > 0) {
        gsap.fromTo(
          scaleBars,
          { opacity: 0, x: -25 },
          {
            opacity: 1,
            x: 0,
            duration: 0.7,
            stagger: 0.09,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec02.querySelector('.cinematic-scale-bars-board') || sec02,
              start: 'top 82%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }

    // ========================================================================
    // 6. CHAPTER 03: WHERE IT BEGINS (Sources grid staggered elevation)
    // ========================================================================
    const sec03 = self.selector('#section-03-sources')[0];
    if (sec03) {
      const sourceFrames = sec03.querySelectorAll('.cinematic-source-frame');
      const innerHeader = sec03.querySelector('.cinematic-sources-inner');

      if (innerHeader) {
        const headerElems = [
          innerHeader.querySelector('.cinematic-chapter-marker'),
          innerHeader.querySelector('.cinematic-marker-sub'),
          innerHeader.querySelector('.cinematic-editorial-title'),
          innerHeader.querySelector('.cinematic-editorial-lead'),
        ].filter(Boolean);

        gsap.fromTo(
          headerElems,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec03,
              start: 'top 78%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (sourceFrames && sourceFrames.length > 0) {
        gsap.fromTo(
          sourceFrames,
          { opacity: 0, y: 45, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.85,
            stagger: personality.staggerDelay,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec03.querySelector('.cinematic-sources-photographic-grid') || sec03,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }

    // ========================================================================
    // 7. CHAPTER 04: HOW IT MOVES (Atmospheric weather & transport vectors)
    // ========================================================================
    const sec04 = self.selector('#section-04-atmospheric-transport')[0];
    if (sec04) {
      const weatherStrip = sec04.querySelector('.cinematic-weather-telemetry-strip');
      const weatherCols = sec04.querySelectorAll('.weather-metric-col');
      const flowCards = sec04.querySelectorAll('.cinematic-transport-flow-card');

      if (weatherCols && weatherCols.length > 0) {
        gsap.fromTo(
          weatherCols,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: personality.ease,
            scrollTrigger: {
              trigger: weatherStrip || sec04,
              start: 'top 82%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (flowCards && flowCards.length > 0) {
        gsap.fromTo(
          flowCards,
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec04.querySelector('.cinematic-transport-flow-deck') || sec04,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }

    // ========================================================================
    // 8. CHAPTER 05: DELHI RIGHT NOW (Giant live telemetry focal reveal)
    // ========================================================================
    const sec05 = self.selector('#section-05-delhi-right-now')[0];
    if (sec05) {
      const liveNumberBlock = sec05.querySelector('.cinematic-live-number-block');
      const giantValue = sec05.querySelector('.cinematic-giant-value');
      const metaCells = sec05.querySelectorAll('.meta-tableau-cell');

      if (liveNumberBlock) {
        gsap.fromTo(
          liveNumberBlock,
          { opacity: 0, scale: 0.91, y: 35 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1.15 * personality.durationMultiplier,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sec05,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (giantValue) {
        gsap.fromTo(
          giantValue,
          { textShadow: '0 0 10px rgba(255,255,255,0.1)' },
          {
            textShadow: '0 0 45px var(--pollutant-glow, rgba(239, 68, 68, 0.45))',
            duration: personality.accentGlowDuration,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          }
        );
      }

      if (metaCells && metaCells.length > 0) {
        gsap.fromTo(
          metaCells,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.08,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec05.querySelector('.cinematic-live-meta-tableau') || sec05,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }

    // ========================================================================
    // 9. CHAPTER 06: THE CITY IS NOT ONE NUMBER (Spatial nodes & Diurnal trace)
    // ========================================================================
    const sec06 = self.selector('#section-06-trends')[0];
    if (sec06) {
      const stationNodes = sec06.querySelectorAll('.cinematic-station-node-card');
      const diurnalBox = sec06.querySelector('.cinematic-diurnal-chart-box');
      const chartSvg = sec06.querySelector('.doc-chart-svg');

      if (stationNodes && stationNodes.length > 0) {
        gsap.fromTo(
          stationNodes,
          { opacity: 0, y: 35, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec06.querySelector('.spatial-stations-row') || sec06,
              start: 'top 82%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (diurnalBox && chartSvg) {
        gsap.fromTo(
          chartSvg,
          { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
          {
            opacity: 1,
            clipPath: 'inset(0 0% 0 0)',
            duration: 1.4,
            ease: 'power2.inOut',
            scrollTrigger: {
              trigger: diurnalBox,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }

    // ========================================================================
    // 10. CHAPTER 07: FROM CITY TO SCHOOL (School proximity & IDW dossier)
    // ========================================================================
    const sec07 = self.selector('#section-07-why-it-matters')[0];
    if (sec07) {
      const schoolCard = sec07.querySelector('.cinematic-school-dossier-card');
      const schoolPhoto = sec07.querySelector('.school-evidence-img');
      const traceStations = sec07.querySelectorAll('.trace-station-item');
      const impactCards = sec07.querySelectorAll('.cinematic-impact-point-card');

      if (schoolCard) {
        gsap.fromTo(
          schoolCard,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec07,
              start: 'top 78%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (schoolPhoto) {
        gsap.fromTo(
          schoolPhoto,
          { scale: 1.08 },
          {
            scale: 1.0,
            duration: 1.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: schoolCard || sec07,
              start: 'top 78%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (traceStations && traceStations.length > 0) {
        gsap.fromTo(
          traceStations,
          { opacity: 0, x: 20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: personality.ease,
            scrollTrigger: {
              trigger: schoolCard || sec07,
              start: 'top 72%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (impactCards && impactCards.length > 0) {
        gsap.fromTo(
          impactCards,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.1,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec07.querySelector('.cinematic-impacts-deck') || sec07,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }

    // ========================================================================
    // 11. CHAPTER 08: 14 DAYS OF EVIDENCE (Calendar dossier wave)
    // ========================================================================
    const sec08 = self.selector('#section-08-the-takeaway')[0];
    if (sec08) {
      const dayFrames = sec08.querySelectorAll('.cinematic-day-frame');
      const quoteDeck = sec08.querySelector('.cinematic-takeaway-quote-deck');

      if (dayFrames && dayFrames.length > 0) {
        gsap.fromTo(
          dayFrames,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.035,
            ease: personality.ease,
            scrollTrigger: {
              trigger: sec08.querySelector('.cinematic-14day-grid') || sec08,
              start: 'top 82%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (quoteDeck) {
        gsap.fromTo(
          quoteDeck,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: personality.ease,
            scrollTrigger: {
              trigger: quoteDeck,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }

    // ========================================================================
    // 12. CHAPTER 09: FINAL TAKEAWAY (Solemn editorial closing cadence)
    // ========================================================================
    const sec09 = self.selector('.cinematic-chapter-takeaway')[0];
    if (sec09) {
      const lines = sec09.querySelectorAll('.cinematic-closing-line');
      const brand = sec09.querySelector('.cinematic-closing-brand');

      if (lines && lines.length > 0) {
        gsap.fromTo(
          lines,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.35,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sec09,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      if (brand) {
        gsap.fromTo(
          brand,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 1.0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: brand,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }

    // ========================================================================
    // 13. POLLUTANT FOOTER (Chapter chips cascade)
    // ========================================================================
    const footer = self.selector('.cinematic-pollutant-nav-footer')[0];
    if (footer) {
      const chips = footer.querySelectorAll('.cinematic-chapter-chip');
      if (chips && chips.length > 0) {
        gsap.fromTo(
          chips,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.06,
            ease: personality.ease,
            scrollTrigger: {
              trigger: footer,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }
  }, containerEl);

  // Handle bfcache (browser back/forward navigation)
  const handlePageShow = (event) => {
    if (event.persisted && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      try {
        ScrollTrigger.refresh();
      } catch (err) {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pageshow', handlePageShow);
  }

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
        ScrollTrigger.refresh();
      } catch (err) {
        // Safe no-op in testing/headless environments
      }
    });
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pageshow', handlePageShow);
    }
    ctx.revert();
  };
}
