import React, { useState, useEffect } from 'react';
import './AppFooter.css';

/**
 * Navigation destination items matching the primary Left Sidebar in PanoramicScrollHero:
 * 1. Home
 * 2. Live AQI Map
 * 3. Pollutants
 * 4. Statistics
 * 5. About
 */
const FOOTER_NAV_ITEMS = [
  { id: 'home', label: 'Home', htmlId: 'app-footer-nav-home', href: '/' },
  { id: 'map', label: 'Live AQI Map', htmlId: 'app-footer-nav-map', href: '#map' },
  { id: 'pollutants', label: 'Pollutants', htmlId: 'app-footer-nav-pollutants', href: '#pollutants' },
  { id: 'statistics', label: 'Statistics', htmlId: 'app-footer-nav-stats', href: '?page=stats' },
  { id: 'about', label: 'About', htmlId: 'app-footer-nav-about', href: '?page=about' },
];

export default function AppFooter({
  onNavigate,
  onHome,
  onMap,
  onPollutants,
  onStats,
  onAbout,
  onBackToCargo,
  currentRoute,
  id = 'app-footer',
  className = '',
  style = {},
}) {
  const detectActiveRoute = () => {
    if (currentRoute) return currentRoute;
    if (typeof window === 'undefined') return 'home';
    const params = new URLSearchParams(window.location.search);
    const hash = (window.location.hash || '').toLowerCase();
    if (params.get('page') === 'about' || params.get('view') === 'about' || hash === '#about') return 'about';
    if (params.get('page') === 'stats' || params.get('view') === 'stats' || hash === '#stats') return 'statistics';
    if (
      params.get('documentary') ||
      hash.startsWith('#documentary') ||
      params.get('pollutant') ||
      hash === '#pollutants' ||
      hash === '#cargo' ||
      hash === '#truck'
    ) {
      return 'pollutants';
    }
    if (params.get('view') === 'map' || params.get('map') === 'true' || hash === '#heatmap' || hash === '#map') {
      return 'map';
    }
    return 'home';
  };

  const [activeRoute, setActiveRoute] = useState(detectActiveRoute);

  useEffect(() => {
    if (currentRoute) {
      setActiveRoute(currentRoute);
      return;
    }

    const handleLocationSync = () => {
      setActiveRoute(detectActiveRoute());
    };

    window.addEventListener('popstate', handleLocationSync);
    window.addEventListener('hashchange', handleLocationSync);
    return () => {
      window.removeEventListener('popstate', handleLocationSync);
      window.removeEventListener('hashchange', handleLocationSync);
    };
  }, [currentRoute]);

  const handleItemClick = (e, item) => {
    e.preventDefault();
    setActiveRoute(item.id);

    if (onNavigate) {
      onNavigate(item.id);
      return;
    }

    if (item.id === 'home') {
      if (onHome) {
        onHome();
        return;
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location);
        url.searchParams.delete('page');
        url.searchParams.delete('view');
        url.searchParams.delete('documentary');
        url.searchParams.delete('pollutant');
        url.searchParams.delete('about');
        url.searchParams.delete('stats');
        url.hash = '';
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (item.id === 'map') {
      if (onMap) {
        onMap();
        return;
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location);
        url.searchParams.delete('page');
        url.searchParams.delete('view');
        url.searchParams.delete('documentary');
        url.searchParams.delete('pollutant');
        url.hash = '#map';
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
        const el =
          document.getElementById('heatmap') ||
          document.querySelector('[data-section="heatmap"]') ||
          document.getElementById('delhi-aqi-heatmap');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo({ top: 900, behavior: 'smooth' });
      }
    } else if (item.id === 'pollutants') {
      if (onPollutants) {
        onPollutants();
        return;
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location);
        url.searchParams.delete('page');
        url.searchParams.delete('view');
        url.searchParams.delete('documentary');
        url.searchParams.delete('pollutant');
        url.hash = '#pollutants';
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
        const el =
          document.getElementById('atmospheric-cargo-section') ||
          document.getElementById('atmospheric-cargo-placeholder');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (item.id === 'statistics') {
      if (onStats) {
        onStats();
        return;
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location);
        url.searchParams.delete('documentary');
        url.searchParams.delete('pollutant');
        url.searchParams.set('page', 'stats');
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    } else if (item.id === 'about') {
      if (onAbout) {
        onAbout();
        return;
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location);
        url.searchParams.delete('documentary');
        url.searchParams.delete('pollutant');
        url.searchParams.set('page', 'about');
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  };

  const handleBackCargoClick = (e) => {
    e.preventDefault();
    if (onBackToCargo) {
      onBackToCargo();
      return;
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('page');
      url.searchParams.delete('view');
      url.searchParams.delete('documentary');
      url.searchParams.delete('pollutant');
      url.hash = '#pollutants';
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
      const el =
        document.getElementById('atmospheric-cargo-section') ||
        document.getElementById('atmospheric-cargo-placeholder');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer
      id={id}
      className={`vayu-footer ${className}`}
      style={style}
      role="contentinfo"
      aria-label="VayuVitals Environmental Intelligence Footer"
    >
      {/* 1. Cinematic Dark Mountain Backdrop Layer */}
      <div className="vayu-footer__backdrop" aria-hidden="true" />

      {/* 2. Atmospheric Vignette & Contrast Overlays */}
      <div className="vayu-footer__vignette" aria-hidden="true" />

      {/* 3. Decorative Circular Wireframe Accent (from reference) */}
      <div className="vayu-footer__halo-ring" aria-hidden="true" />

      {/* 4. Responsive Content Container */}
      <div className="vayu-footer__container">
        {/* LEFT SIDE: Corner Hairline Accent, Statement & Editorial Branding */}
        <div className="vayu-footer__left">
          <div className="vayu-footer__bracket-wrap">
            <div className="vayu-footer__lines-accent" aria-hidden="true">
              <div className="vayu-footer__line-horiz" />
              <div className="vayu-footer__line-vert" />
            </div>
            <p className="vayu-footer__statement">
              <span className="vayu-footer__statement-line doc-credo-line-1">THE AIR</span>
              <span className="vayu-footer__statement-line doc-credo-line-2">WE BREATHE</span>
              <span className="vayu-footer__statement-line doc-credo-line-3">SHAPES TOMORROW.</span>
            </p>
          </div>

          <div className="vayu-footer__brand-block">
            <span
              className="vayu-footer__logo"
              role="button"
              tabIndex={0}
              onClick={(e) => handleItemClick(e, FOOTER_NAV_ITEMS[0])}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleItemClick(e, FOOTER_NAV_ITEMS[0])}
              aria-label="VayuVitals Home"
            >
              VayuVitals
            </span>
            <span className="vayu-footer__subtitle">ENVIRONMENTAL INTELLIGENCE</span>
          </div>
        </div>

        {/* CENTER: Left Sidebar Navigation Links */}
        <div className="vayu-footer__nav-group">
          <nav className="vayu-footer__nav" aria-label="Footer Sidebar Navigation">
            {FOOTER_NAV_ITEMS.map((item, idx) => (
              <React.Fragment key={item.id}>
                <a
                  href={item.href}
                  id={item.htmlId}
                  className={`vayu-footer__nav-link ${activeRoute === item.id ? 'active' : ''}`}
                  onClick={(e) => handleItemClick(e, item)}
                  aria-label={item.label}
                  aria-current={activeRoute === item.id ? 'page' : undefined}
                >
                  {item.label}
                </a>
                {idx < FOOTER_NAV_ITEMS.length - 1 && (
                  <span className="vayu-footer__nav-divider" aria-hidden="true" />
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* RIGHT SIDE: Italic Quote & Back to Atmospheric Cargo Button */}
        <div className="vayu-footer__right">
          <p className="vayu-footer__tagline">
            <span className="vayu-footer__tagline-line">KNOWLEDGE TODAY.</span>
            <span className="vayu-footer__tagline-line">A SAFER TOMORROW.</span>
          </p>

          <button
            type="button"
            id="doc-back-cargo-btn"
            className="vayu-footer__cargo-btn"
            onClick={handleBackCargoClick}
            aria-label="Back to Atmospheric Cargo"
          >
            <span id="doc-return-to-story-cta">← Back to Atmospheric Cargo</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
