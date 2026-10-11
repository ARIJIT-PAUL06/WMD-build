import React from 'react';

/**
 * WmdFooter - Minimalist Sepia Editorial Closing
 * Implements strict GSAP animation hook classes (§6):
 * - .documentary-footer
 * - .doc-credo-line-1
 * - .doc-credo-line-2
 * - .doc-credo-line-3
 */
export default function WmdFooter({ onBack }) {
  return (
    <footer id="wmd-footer" className="wmd-footer documentary-footer" role="contentinfo">
      {/* Background Forest Photo Layer with Sepia Duotone & Vignette */}
      <div
        className="wmd-footer__backdrop wmd-photo"
        style={{
          backgroundImage: 'url(/assets/documentary/wmd/wmd_footer_forest.webp)',
        }}
        aria-hidden="true"
      />
      <div className="wmd-footer__vignette" aria-hidden="true" />

      {/* Decorative Halo Ring (cropped at top) */}
      <div className="wmd-footer__halo-ring" aria-hidden="true" />

      <div className="wmd-footer__container">
        {/* Left: Credo Lines & Hairline Accent */}
        <div className="wmd-footer__left">
          <div className="wmd-footer__lines-accent" aria-hidden="true">
            <div className="wmd-footer__line-horiz" />
            <div className="wmd-footer__line-vert" />
          </div>
          <div className="wmd-footer__credo">
            <p className="wmd-footer__credo-line doc-credo-line-1">THE AIR</p>
            <p className="wmd-footer__credo-line doc-credo-line-2">WE BREATHE</p>
            <p className="wmd-footer__credo-line doc-credo-line-3">SHAPES TOMORROW.</p>
          </div>
        </div>

        {/* Right: Master Logo, Subtitle, Hairline, Tagline, and Return Link */}
        <div className="wmd-footer__right">
          <div className="wmd-footer__brand-block">
            <div className="wmd-footer__logo">VayuVitals</div>
            <div className="wmd-footer__subtitle">ENVIRONMENTAL INTELLIGENCE</div>
          </div>

          <div className="wmd-footer__divider-hairline" aria-hidden="true" />

          <p className="wmd-footer__tagline">
            KNOWLEDGE TODAY.<br />
            A SAFER TOMORROW.
          </p>

          <button
            type="button"
            id="doc-back-cargo-btn"
            className="wmd-footer__back-link"
            onClick={onBack}
            aria-label="Return to Atmospheric Cargo Hauler"
          >
            <span id="doc-return-to-story-cta">← Back to Atmospheric Cargo</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
