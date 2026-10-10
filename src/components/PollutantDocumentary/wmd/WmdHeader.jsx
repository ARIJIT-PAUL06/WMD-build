import React, { useState, useCallback } from 'react';
import { Search, Globe, ChartNoAxesColumn, Menu, X } from 'lucide-react';

/**
 * WmdHeader - Top Navigation Overlay
 * Root element carries `documentary-nav` for GSAP animation choreography.
 */
export default function WmdHeader({ onBack: _onBack }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = useCallback((id) => {
    setMobileMenuOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleMapClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.search = '?view=map';
    }
  }, []);

  const handleSearchClick = useCallback(() => {
    scrollToSection('wmd-documentaries-strip');
    const firstChip = document.querySelector('.doc-pollutant-chip');
    if (firstChip) firstChip.focus();
  }, [scrollToSection]);

  return (
    <header className="wmd-header documentary-nav" id="wmd-topbar">
      {/* Left: Master Logo and Subtitle */}
      <div className="wmd-header__branding">
        <button
          type="button"
          id="deep-dive-back-to-story-btn"
          className="wmd-header__logo-btn"
          onClick={() => {
            if (_onBack) {
              _onBack();
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          aria-label="VayuVitals home"
        >
          <span className="wmd-header__logo-text">VayuVitals</span>
        </button>
        <span className="wmd-header__subtext">ENVIRONMENTAL INTELLIGENCE</span>
      </div>

      {/* Centre-Right: Editorial Navigation Links */}
      <nav className="wmd-header__nav" aria-label="Primary Editorial Navigation">
        <button
          type="button"
          className="wmd-header__nav-link active"
          onClick={() => scrollToSection('wmd-documentaries-strip')}
        >
          DOCUMENTARIES
        </button>
        <button
          type="button"
          className="wmd-header__nav-link"
          onClick={handleMapClick}
        >
          MAP
        </button>
        <button
          type="button"
          className="wmd-header__nav-link"
          onClick={() => {
            const takeaway = document.getElementById('section-08-the-takeaway');
            if (takeaway) {
              takeaway.scrollIntoView({ behavior: 'smooth' });
            } else {
              scrollToSection('wmd-impact-row');
            }
          }}
        >
          TIMELINE
        </button>
        <button
          type="button"
          className="wmd-header__nav-link"
          onClick={() => scrollToSection('wmd-footer')}
        >
          ABOUT
        </button>
      </nav>

      {/* Right: Quick Telemetry Action Buttons */}
      <div className="wmd-header__actions">
        <button
          type="button"
          className="wmd-header__action-btn"
          onClick={handleSearchClick}
          aria-label="Search all pollutant dossiers"
          title="Search Documentaries"
        >
          <Search size={22} strokeWidth={1.25} />
        </button>
        <button
          type="button"
          className="wmd-header__action-btn"
          onClick={handleMapClick}
          aria-label="Open Delhi AQI Spatial Heatmap"
          title="Delhi AQI Heatmap"
        >
          <Globe size={22} strokeWidth={1.25} />
        </button>
        <button
          type="button"
          className="wmd-header__action-btn"
          onClick={() => scrollToSection('wmd-impact-row')}
          aria-label="Jump to Telemetry Impact Statistics"
          title="Global Impact & Telemetry"
        >
          <ChartNoAxesColumn size={22} strokeWidth={1.25} />
        </button>
      </div>

      {/* Mobile Hamburger Trigger */}
      <button
        type="button"
        className="wmd-header__mobile-toggle"
        onClick={() => setMobileMenuOpen((prev) => !prev)}
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? <X size={26} strokeWidth={1.25} /> : <Menu size={26} strokeWidth={1.25} />}
      </button>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="wmd-header__mobile-overlay">
          <div className="wmd-header__mobile-links">
            <button
              type="button"
              className="wmd-header__mobile-nav-link"
              onClick={() => scrollToSection('wmd-documentaries-strip')}
            >
              DOCUMENTARIES
            </button>
            <button
              type="button"
              className="wmd-header__mobile-nav-link"
              onClick={handleMapClick}
            >
              MAP
            </button>
            <button
              type="button"
              className="wmd-header__mobile-nav-link"
              onClick={() => {
                const takeaway = document.getElementById('section-08-the-takeaway');
                if (takeaway) takeaway.scrollIntoView({ behavior: 'smooth' });
                else scrollToSection('wmd-impact-row');
                setMobileMenuOpen(false);
              }}
            >
              TIMELINE
            </button>
            <button
              type="button"
              className="wmd-header__mobile-nav-link"
              onClick={() => scrollToSection('wmd-footer')}
            >
              ABOUT
            </button>
          </div>
          <div className="wmd-header__mobile-actions">
            <button type="button" className="wmd-header__action-btn" onClick={handleSearchClick}>
              <Search size={22} strokeWidth={1.25} />
            </button>
            <button type="button" className="wmd-header__action-btn" onClick={handleMapClick}>
              <Globe size={22} strokeWidth={1.25} />
            </button>
            <button
              type="button"
              className="wmd-header__action-btn"
              onClick={() => scrollToSection('wmd-impact-row')}
            >
              <ChartNoAxesColumn size={22} strokeWidth={1.25} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
