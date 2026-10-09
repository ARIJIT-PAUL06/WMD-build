/**
 * documentaryAnimations.js
 * VayuVitals - Forge-Inspired Motion & Cinematic Animation Engine
 *
 * Implements 3-tier motion architecture inspired by Forge Automotive:
 *
 * LEVEL 1 (100-300ms): Micro-interactions (buttons, hover, tabs, chips)
 * LEVEL 2 (400-900ms): Staggered component reveals & masked typography
 * LEVEL 3 (Scroll-driven):
 *   - Hero entrance choreography with controlled stagger
 *   - Circular arc gauge stroke draw & number counter interpolation
 *   - Pinned interactive airshed storytelling sequence (SOURCE -> MOVEMENT -> EXPOSURE -> IMPACT)
 *   - Cinematic image parallax with subtle horizontal drift (scale 1.08 -> 1.0)
 *   - Proportional aerodynamic scale bars progressive fill
 *   - 24-hr diurnal SVG line draw
 *
 * Full React lifecycle safety with gsap.context(), synchronous scroll reset,
 * ScrollTrigger.clearScrollMemory(), and prefers-reduced-motion compliance.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Initialize all GSAP and ScrollTrigger animations for the active pollutant documentary.
 * Scoped strictly to containerEl using gsap.context().
 *
 * @param {HTMLElement} containerEl - Root element (.documentary-page)
 * @param {string} pollutantId - Active pollutant ID ('pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3')
 * @returns {Function} cleanup - Function to revert animations and kill ScrollTriggers
 */
export function setupDocumentaryAnimations(containerEl, pollutantId = 'pm25') {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !containerEl) {
    return () => { };
  }

  // 1. Enforce scroll reset to top (scrollY = 0) and clear ScrollTrigger memory
  if (ScrollTrigger.clearScrollMemory) {
    ScrollTrigger.clearScrollMemory();
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;

  // 2. Check for prefers-reduced-motion
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Reveal all elements statically with zero transitions
    const elements = containerEl.querySelectorAll(
      '.documentary-nav, .documentary-hero-editorial-col, .documentary-value-container, .documentary-data-panel, .documentary-section, .documentary-image-frame, .documentary-data-section, .documentary-pinned-card, .doc-scale-fill'
    );
    elements.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      if (el.classList.contains('documentary-pinned-card')) {
        el.style.display = 'block';
      }
    });
    return () => { };
  }

  // 3. Create scoped GSAP context for complete React lifecycle safety
  const ctx = gsap.context(() => {
    // =======================================================================
    // TIER 3A: HERO ENTRANCE CHOREOGRAPHY (Live Environmental Monitoring Sequence)
    // 1. Background atmosphere establishes itself
    // 2. Navigation appears
    // 3. Small environmental label reveals
    // 4. Pollutant title reveals
    // 5. Tagline appears
    // 6. Environmental parameters appear
    // 7. Central visualization draws
    // 8. Current value resolves into view (subtle scale, blur-to-sharp, opacity)
    // 9. Status appears
    // 10. Location visualization activates
    // 11. Bottom telemetry appears
    // =======================================================================
    const heroTl = gsap.timeline({
      defaults: { ease: 'power3.out' },
    });

    // Step 1: Background atmospheric layer establishes itself
    const bgBackdrop = containerEl.querySelector('.documentary-hero-ambient-backdrop');
    if (bgBackdrop) {
      heroTl.fromTo(
        bgBackdrop,
        { opacity: 0.3, scale: 1.04 },
        { opacity: 1, scale: 1.0, duration: 0.9, ease: 'power2.out' },
        0
      );
    }

    // Step 1b: Monumental sculptural watermark glyph reveals softly in the atmospheric depth
    const heroGlyph = containerEl.querySelector('.documentary-hero-sculptural-glyph');
    if (heroGlyph) {
      heroTl.fromTo(
        heroGlyph,
        { opacity: 0, scale: 0.94 },
        { opacity: 0.045, scale: 1.0, duration: 1.2, ease: 'power2.out' },
        0.04
      );
    }

    // Step 2: Floating navigation bar drops down smoothly
    const nav = containerEl.querySelector('.documentary-nav');
    if (nav) {
      heroTl.fromTo(
        nav,
        { y: -16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
        0.08
      );
    }

    // Step 3: Small environmental label / kicker reveals with animated letter spacing settling into normal
    const kickerTag = containerEl.querySelector('.documentary-pollutant-kicker-tag');
    if (kickerTag) {
      heroTl.fromTo(
        kickerTag,
        { opacity: 0, y: -6, letterSpacing: '0.36em' },
        { opacity: 1, y: 0, letterSpacing: '0.22em', duration: 0.7, ease: 'power2.out' },
        0.12
      );
    }

    // Step 4: Pollutant title with cinematic masked character-level reveal (30-60ms stagger)
    const pollutantNameEl = containerEl.querySelector('.documentary-pollutant-name');
    const pollutantTitleRow = containerEl.querySelector('.documentary-pollutant-title-row');
    if (pollutantNameEl) {
      if (!pollutantNameEl.querySelector('.doc-hero-char')) {
        const rawChars = Array.from(pollutantNameEl.textContent.trim());
        const mappedHtml = rawChars
          .map((c) => `<span class="doc-char-mask"><span class="doc-hero-char">${c === ' ' ? '&nbsp;' : c}</span></span>`)
          .join('');
        pollutantNameEl.innerHTML = `<span class="doc-pollutant-name-nowrap">${mappedHtml}</span>`;
      }
      const heroChars = pollutantNameEl.querySelectorAll('.doc-hero-char');
      if (heroChars.length > 0) {
        heroTl.fromTo(
          heroChars,
          { yPercent: 120, opacity: 0, filter: 'blur(8px)' },
          {
            yPercent: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.8,
            stagger: 0.045, // 45ms character stagger
            ease: 'power3.out',
          },
          0.16
        );
      }
    } else if (pollutantTitleRow) {
      heroTl.fromTo(
        pollutantTitleRow,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        0.18
      );
    }

    const chemTag = containerEl.querySelector('.documentary-pollutant-chem-formula');
    const asciiTag = containerEl.querySelector('.documentary-pollutant-ascii-symbol');
    if (chemTag || asciiTag) {
      const extraTags = [asciiTag, chemTag].filter(Boolean);
      heroTl.fromTo(
        extraTags,
        { opacity: 0, x: -6 },
        { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' },
        0.35
      );
    }

    // Step 5: Tagline / headline with editorial line-based masked reveal
    const headlineEl = containerEl.querySelector('.documentary-hero-headline');
    const editorialQuote = containerEl.querySelector('.documentary-editorial-quote');
    const editorialDesc = containerEl.querySelector('.documentary-editorial-desc');
    if (headlineEl) {
      if (!headlineEl.querySelector('.doc-headline-line')) {
        const text = headlineEl.textContent.trim();
        const words = text.split(/\s+/);
        if (words.length > 2) {
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(' ');
          const line2 = words.slice(mid).join(' ');
          headlineEl.innerHTML = `
            <span class="doc-headline-line-mask"><span class="doc-headline-line">${line1}</span></span>
            <span class="doc-headline-line-mask"><span class="doc-headline-line">${line2}</span></span>
          `;
        } else {
          headlineEl.innerHTML = `<span class="doc-headline-line-mask"><span class="doc-headline-line">${text}</span></span>`;
        }
      }
      const lines = headlineEl.querySelectorAll('.doc-headline-line');
      if (lines.length > 0) {
        heroTl.fromTo(
          lines,
          { yPercent: 110, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.75,
            stagger: 0.09, // Staggered line reveal
            ease: 'power3.out',
          },
          0.22
        );
      }
    }
    if (editorialQuote) {
      heroTl.fromTo(
        editorialQuote,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        0.28
      );
    }
    if (editorialDesc) {
      heroTl.fromTo(
        editorialDesc,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
        0.32
      );
    }

    // Step 6: Environmental parameters (weather strip & metadata) with micro-label tracking entrance
    const weatherItems = containerEl.querySelectorAll('.doc-weather-item');
    const metaRow = containerEl.querySelector('.documentary-editorial-metadata');
    if (weatherItems.length > 0) {
      heroTl.fromTo(
        weatherItems,
        { opacity: 0, y: 8, letterSpacing: '0.12em' },
        { opacity: 1, y: 0, letterSpacing: '0.04em', duration: 0.55, stagger: 0.04, ease: 'power2.out' },
        0.28
      );
    }
    if (metaRow) {
      heroTl.fromTo(
        metaRow,
        { opacity: 0, letterSpacing: '0.12em' },
        { opacity: 1, letterSpacing: '0.05em', duration: 0.55, ease: 'power2.out' },
        0.32
      );
    }

    // Step 7: Central visualization draws (circular arc & gauge container)
    const gaugeContainer = containerEl.querySelector('.documentary-value-container');
    const arcPath = containerEl.querySelector('#doc-active-gauge-arc');
    const bead = containerEl.querySelector('.documentary-gauge-bead');
    if (gaugeContainer) {
      heroTl.fromTo(
        gaugeContainer,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1.0, duration: 0.7, ease: 'power2.out' },
        0.32
      );
    }
    if (arcPath) {
      const currentDashoffset = parseFloat(arcPath.getAttribute('stroke-dashoffset') || '0');
      const strokeDasharray = arcPath.getAttribute('stroke-dasharray') || '';
      const totalLength = parseFloat(strokeDasharray.split(' ')[0] || '586');

      heroTl.fromTo(
        arcPath,
        { strokeDashoffset: totalLength },
        { strokeDashoffset: currentDashoffset, duration: 1.0, ease: 'power2.inOut' },
        0.35
      );

      if (bead) {
        const targetX = parseFloat(bead.getAttribute('cx') || '160');
        const targetY = parseFloat(bead.getAttribute('cy') || '160');
        let targetAngleDeg = (Math.atan2(targetY - 160, targetX - 160) * 180) / Math.PI;
        if (targetAngleDeg < 149.9) targetAngleDeg += 360;

        const beadTracker = { t: 0 };
        heroTl.fromTo(
          bead,
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' },
          0.35
        );
        heroTl.to(
          beadTracker,
          {
            t: 1,
            duration: 1.0,
            ease: 'power2.inOut',
            onUpdate: () => {
              const curDeg = 150 + beadTracker.t * (targetAngleDeg - 150);
              const curRad = (curDeg * Math.PI) / 180;
              const curX = (160 + 140 * Math.cos(curRad)).toFixed(2);
              const curY = (160 + 140 * Math.sin(curRad)).toFixed(2);
              bead.setAttribute('cx', curX);
              bead.setAttribute('cy', curY);
            },
          },
          0.35
        );
      }
    }

    // Step 8: Large number resolution effect (blur-to-sharp optical resolving while preserving authentic measurement)
    const numEl = containerEl.querySelector('#doc-central-numeric-readout');
    const unitEl = containerEl.querySelector('.documentary-value-unit-row');
    if (numEl) {
      heroTl.fromTo(
        numEl,
        { opacity: 0, scale: 0.93, filter: 'blur(16px)' },
        { opacity: 1, scale: 1.0, filter: 'blur(0px)', duration: 0.85, ease: 'power2.out' },
        0.36
      );
    }
    // Unit appears subtly underneath the resolved number
    if (unitEl) {
      heroTl.fromTo(
        unitEl,
        { opacity: 0, y: 5, letterSpacing: '0.12em' },
        { opacity: 0.9, y: 0, letterSpacing: '0.04em', duration: 0.45, ease: 'power2.out' },
        0.62
      );
    }

    // Step 9: Status pill & location pin attached to measurement settling smoothly
    const statusPill = containerEl.querySelector('.documentary-value-status-badge');
    const locationPin = containerEl.querySelector('.documentary-value-location');
    if (statusPill) {
      heroTl.fromTo(
        statusPill,
        { opacity: 0, scale: 0.88, y: -8 },
        { opacity: 1, scale: 1.0, y: 0, duration: 0.5, ease: 'power2.out' },
        0.68
      );
    }
    if (locationPin) {
      heroTl.fromTo(
        locationPin,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        0.72
      );
    }

    // Step 10: Location visualization activates
    const spatialCard = containerEl.querySelector('.documentary-spatial-map-card');
    if (spatialCard) {
      heroTl.fromTo(
        spatialCard,
        { opacity: 0, x: 18 },
        { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' },
        0.65
      );
    }

    // Step 11: Bottom telemetry appears with sequential chip stagger and sparkline progressive draw
    const bottomDataPanel = containerEl.querySelector('.documentary-data-panel');
    if (bottomDataPanel) {
      heroTl.fromTo(
        bottomDataPanel,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
        0.75
      );

      const chips = bottomDataPanel.querySelectorAll('.doc-pollutant-chip');
      if (chips.length > 0) {
        heroTl.fromTo(
          chips,
          { opacity: 0, scale: 0.95, y: 6 },
          { opacity: 1, scale: 1, y: 0, duration: 0.35, stagger: 0.025, ease: 'power2.out' },
          0.82
        );
      }

      const sparklinePath = bottomDataPanel.querySelector('.doc-sparkline-path');
      if (sparklinePath) {
        const pathLength = 320;
        heroTl.fromTo(
          sparklinePath,
          { strokeDasharray: pathLength, strokeDashoffset: pathLength },
          { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' },
          0.85
        );
      }
    }

    // =======================================================================
    // TIER 3A-2: HERO SCROLL-DRIVEN TRANSFORMATION (AIR MONITORING -> DEEP ANALYSIS)
    // As user scrolls, hero gracefully transforms into the deep documentary flow.
    // =======================================================================
    const heroSection = containerEl.querySelector('#documentary-hero-viewport');
    if (heroSection) {
      const heroPhoto = heroSection.querySelector('.documentary-hero-photo-layer');
      const heroHaze = heroSection.querySelector('.documentary-hero-haze-layer');
      const heroGlyph = heroSection.querySelector('.documentary-hero-sculptural-glyph');
      const pollutantTitleRow = heroSection.querySelector('.documentary-pollutant-title-row');
      const editorialCol = heroSection.querySelector('.documentary-hero-editorial-col');
      const centerCol = heroSection.querySelector('.documentary-hero-center-col');
      const spatialCol = heroSection.querySelector('.documentary-hero-spatial-col');
      const bottomDeck = heroSection.querySelector('.documentary-hero-bottom-deck');

      const heroScrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroSection,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.8,
        },
      });

      if (heroPhoto) {
        heroScrollTl.to(heroPhoto, { scale: 1.12, yPercent: 6, ease: 'none' }, 0);
      }
      if (heroHaze) {
        heroScrollTl.to(heroHaze, { opacity: 0.35, yPercent: -10, ease: 'none' }, 0);
      }
      if (heroGlyph) {
        heroScrollTl.to(heroGlyph, { yPercent: -22, scale: 1.15, opacity: 0.01, ease: 'none' }, 0);
      }
      // Kinetic Hero Typography: pollutant title scales up, drifts horizontally, and recedes into background depth
      if (pollutantTitleRow) {
        heroScrollTl.to(
          pollutantTitleRow,
          {
            scale: 1.42,
            x: 26,
            y: -38,
            opacity: 0.14,
            ease: 'none',
          },
          0
        );
      }
      if (editorialCol) {
        heroScrollTl.to(editorialCol, { y: -35, opacity: 0.4, ease: 'none' }, 0);
      }
      if (centerCol) {
        // Measurement gauge gracefully recedes into atmospheric depth
        heroScrollTl.to(centerCol, { scale: 0.76, filter: 'blur(8px)', opacity: 0, y: -45, ease: 'power1.in' }, 0);
      }
      if (spatialCol) {
        heroScrollTl.to(spatialCol, { y: -30, opacity: 0.4, ease: 'none' }, 0);
      }
      if (bottomDeck) {
        heroScrollTl.to(bottomDeck, { y: 35, opacity: 0, ease: 'none' }, 0);
      }
    }

    // =======================================================================
    // TIER 3B: FORGE & TRIONN-INSPIRED PINNED STORY SEQUENCE
    // Background image stays pinned while 4 narrative investigation beats
    // crossfade as the user scrolls through the airshed journey.
    // =======================================================================
    const pinnedSection = containerEl.querySelector('.documentary-pinned-story-section');
    if (pinnedSection) {
      const pinnedBgImg = pinnedSection.querySelector('.documentary-pinned-bg-img');
      const pinnedWatermark = pinnedSection.querySelector('.documentary-pinned-sculptural-watermark');
      const beatCards = pinnedSection.querySelectorAll('.documentary-pinned-card');
      const stepItems = pinnedSection.querySelectorAll('.doc-ribbon-step-item');

      if (beatCards.length > 0) {
        // Initial state: first card visible, others hidden
        gsap.set(beatCards, { opacity: 0, y: 40, display: 'none' });
        gsap.set(beatCards[0], { opacity: 1, y: 0, display: 'block' });

        const pinnedTl = gsap.timeline({
          scrollTrigger: {
            trigger: pinnedSection,
            start: 'top top',
            end: '+=250%',
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            onUpdate: (self) => {
              const progress = self.progress; // 0 to 1
              const activeIndex = Math.min(
                beatCards.length - 1,
                Math.floor(progress * beatCards.length)
              );
              stepItems.forEach((item, idx) => {
                if (idx <= activeIndex) {
                  item.classList.add('active');
                } else {
                  item.classList.remove('active');
                }
              });
            },
          },
        });

        // Continuous SVG vector progress line scrubs along entire sequence
        const ribbonProgressLine = pinnedSection.querySelector('#doc-ribbon-progress-line');
        if (ribbonProgressLine) {
          pinnedTl.fromTo(
            ribbonProgressLine,
            { strokeDashoffset: 280 },
            { strokeDashoffset: 0, ease: 'none' },
            0
          );
        }

        // Background image slow cinematic camera scale
        if (pinnedBgImg) {
          pinnedTl.fromTo(
            pinnedBgImg,
            { scale: 1.08, y: 0 },
            { scale: 1.0, y: -15, ease: 'none' },
            0
          );
        }

        // Pinned background sculptural watermark drift
        if (pinnedWatermark) {
          pinnedTl.fromTo(
            pinnedWatermark,
            { yPercent: 10, scale: 0.95, opacity: 0.03 },
            { yPercent: -15, scale: 1.08, opacity: 0.07, ease: 'none' },
            0
          );
        }

        // Crossfade through the 4 narrative cards with coordinated schematic reveal
        for (let i = 0; i < beatCards.length - 1; i++) {
          const curr = beatCards[i];
          const next = beatCards[i + 1];

          pinnedTl.to(
            curr,
            { opacity: 0, y: -30, duration: 0.4, onComplete: () => { curr.style.display = 'none'; } },
            `beat-${i}`
          );

          pinnedTl.set(next, { display: 'block', y: 30, opacity: 0 });

          pinnedTl.to(
            next,
            { opacity: 1, y: 0, duration: 0.4 },
            `beat-${i}+=0.15`
          );

          const nextSchematic = next.querySelector('.doc-card-schematic-wrap');
          if (nextSchematic) {
            pinnedTl.fromTo(
              nextSchematic,
              { opacity: 0.3, y: 12 },
              { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
              `beat-${i}+=0.22`
            );
          }
        }
      }
    }

    // =======================================================================
    // TIER 3C: CINEMATIC IMAGE CLIP-PATH & PARALLAX TRANSFORMATION
    // Image transitions from framed inset to cinematic bleed with parallax
    // =======================================================================
    const imageSection = containerEl.querySelector('.documentary-image-section');
    if (imageSection) {
      const imgFrame = imageSection.querySelector('.documentary-image-frame');
      const imgEl = imageSection.querySelector('.documentary-image-element');
      const captionTitle = imageSection.querySelector('.doc-caption-title');
      const captionOverlay = imageSection.querySelector('.documentary-image-caption-overlay');

      if (imgFrame && imgEl) {
        // Trionn-style clip-path expansion as section enters viewport
        gsap.fromTo(
          imgFrame,
          { clipPath: 'inset(6% 4% 6% 4% round 20px)' },
          {
            clipPath: 'inset(0% 0% 0% 0% round 0px)',
            ease: 'power2.out',
            scrollTrigger: {
              trigger: imageSection,
              start: 'top 80%',
              end: 'bottom 80%',
              scrub: 1.0,
            },
          }
        );

        gsap.fromTo(
          imgEl,
          { scale: 1.12, xPercent: -2 },
          {
            scale: 1.0,
            xPercent: 2,
            ease: 'none',
            scrollTrigger: {
              trigger: imageSection,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2,
            },
          }
        );
      }

      if (captionTitle) {
        gsap.fromTo(
          captionTitle,
          { yPercent: 100, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: captionTitle,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        );
      } else if (captionOverlay) {
        gsap.fromTo(
          captionOverlay,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: captionOverlay,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    }

    // =======================================================================
    // TIER 2: EDITORIAL SECTION REVEALS & MASKED TYPOGRAPHY
    // =======================================================================
    const sections = containerEl.querySelectorAll('.documentary-section');
    sections.forEach((section) => {
      const header = section.querySelector('.documentary-section-header');
      const kickerEl = section.querySelector('.documentary-section-kicker');
      const titleEl = section.querySelector('.documentary-section-title');
      const ghostWatermark = section.querySelector('.doc-section-ghost-watermark');

      // Giant Ghost Pollutant Typography subtle parallax drift behind section content
      if (ghostWatermark) {
        gsap.fromTo(
          ghostWatermark,
          { yPercent: 14, scale: 0.96, opacity: 0.022 },
          {
            yPercent: -18,
            scale: 1.05,
            opacity: 0.038,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2,
            },
          }
        );
      }

      // Editorial section micro-kicker letter spacing entrance
      if (kickerEl) {
        gsap.fromTo(
          kickerEl,
          { opacity: 0, y: 10, letterSpacing: '0.22em' },
          {
            opacity: 1,
            y: 0,
            letterSpacing: '0.14em',
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      if (titleEl) {
        gsap.fromTo(
          titleEl,
          { yPercent: 105, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.85,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 82%',
              toggleActions: 'play none none none',
            },
          }
        );
      } else if (header) {
        gsap.fromTo(
          header,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 82%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      // Animate cards inside this section with stagger
      const cards = section.querySelectorAll(
        '.documentary-source-card, .documentary-flow-card, .documentary-impact-card, .doc-standard-card, .doc-chem-metric-card'
      );
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 78%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    });

    // Aerodynamic scale comparison bars progressive fill on scroll
    const scaleRows = containerEl.querySelectorAll('.doc-scale-row');
    if (scaleRows.length > 0) {
      scaleRows.forEach((row, idx) => {
        const fill = row.querySelector('.doc-scale-fill');
        if (fill) {
          const targetWidth = fill.style.width || '50%';
          gsap.fromTo(
            fill,
            { width: '0%' },
            {
              width: targetWidth,
              duration: 1.0,
              delay: idx * 0.1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: row,
                start: 'top 88%',
                toggleActions: 'play none none none',
              },
            }
          );
        }
      });
    }

    // 14-Day Calendar cards staggered entrance
    const dayFrames = containerEl.querySelectorAll('.cinematic-day-frame');
    if (dayFrames.length > 0) {
      gsap.fromTo(
        dayFrames,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          stagger: 0.04,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.cinematic-14day-grid',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }

    // Science & Telemetry Section: Title masked reveal and 24-hr Diurnal Chart path draw
    const dataTitle = containerEl.querySelector('.documentary-data-title');
    if (dataTitle) {
      gsap.fromTo(
        dataTitle,
        { yPercent: 105, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.85,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.documentary-data-section',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }

    const diurnalSvg = containerEl.querySelector('.doc-diurnal-svg');
    if (diurnalSvg) {
      const chartPath = diurnalSvg.querySelector('path[fill="none"]');
      const areaPath = diurnalSvg.querySelector('path[fill^="url"]');
      const points = diurnalSvg.querySelectorAll('circle');
      const labels = diurnalSvg.querySelectorAll('text');

      const diurnalTl = gsap.timeline({
        scrollTrigger: {
          trigger: diurnalSvg,
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
      });

      if (chartPath) {
        const pathLength = 800;
        diurnalTl.fromTo(
          chartPath,
          { strokeDasharray: pathLength, strokeDashoffset: pathLength },
          { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out' },
          0
        );
      }
      if (areaPath) {
        diurnalTl.fromTo(
          areaPath,
          { opacity: 0 },
          { opacity: 1, duration: 0.8, ease: 'power1.out' },
          0.35
        );
      }
      if (points.length > 0) {
        diurnalTl.fromTo(
          points,
          { scale: 0, opacity: 0, transformOrigin: 'center center' },
          { scale: 1, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.5)' },
          0.45
        );
      }
      if (labels.length > 0) {
        diurnalTl.fromTo(
          labels,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' },
          0.55
        );
      }
    }

    // Footer Credo & Chapter exploration chips reveal
    const footer = containerEl.querySelector('.documentary-footer');
    if (footer) {
      gsap.fromTo(
        footer.querySelectorAll('.doc-credo-line-1, .doc-credo-line-2, .doc-credo-line-3'),
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: footer,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        }
      );
    }
  }, containerEl);

  // Refresh ScrollTrigger once DOM layout and images are primed
  const refreshTimer = setTimeout(() => {
    ScrollTrigger.refresh();
  }, 120);

  return () => {
    clearTimeout(refreshTimer);
    ctx.revert();
  };
}
