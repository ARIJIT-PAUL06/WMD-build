import React from 'react';
import {
  POLLUTANT_DOCUMENTARY_LIST,
} from '../../../data/pollutantDocumentaries.js';
import { POLLUTANT_CINEMATIC_THEMES } from '../PollutantDocumentary.jsx';

/**
 * WmdDocumentaryStrip - All Documentaries Navigation Strip
 * Root carries `documentary-data-panel` for the GSAP chip stagger animation (§6).
 * Each tile carries `doc-pollutant-chip`.
 */
export default function WmdDocumentaryStrip({
  activePollutantId,
  onSelectPollutant,
}) {
  const totalCount = String(POLLUTANT_DOCUMENTARY_LIST.length).padStart(2, '0');


  return (
    <section
      id="wmd-documentaries-strip"
      className="wmd-strip documentary-data-panel"
      aria-label="All Atmospheric Pollutant Documentaries"
    >
      <div className="wmd-strip__header">
        <div className="wmd-strip__title-group">
          <h2 className="wmd-strip__title">ALL DOCUMENTARIES</h2>
          <div className="wmd-strip__hairline" />
        </div>
        <div className="wmd-strip__count">
          {totalCount} TOTAL
        </div>
      </div>

      <nav className="wmd-strip__grid" aria-label="Pollutant documentaries">
        {POLLUTANT_DOCUMENTARY_LIST.map((pollutant, idx) => {
          const isActive = pollutant.id === activePollutantId;
          const numStr = String(idx + 1).padStart(2, '0');
          const imageUrl = POLLUTANT_CINEMATIC_THEMES[pollutant.id]?.heroImage;

          return (
            <button
              key={pollutant.id}
              id={`explore-another-${pollutant.id}`}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              className={`wmd-strip__tile doc-pollutant-chip ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectPollutant && onSelectPollutant(pollutant.id)}
            >
              <div className="wmd-strip__card">
                <div className="wmd-strip__img-box">
                  <img
                    src={imageUrl}
                    alt={`${pollutant.symbol} Documentary`}
                    className="wmd-strip__img wmd-photo"
                    loading="lazy"
                  />
                </div>
                <div className="wmd-strip__meta">
                  <span className="wmd-strip__num">{numStr}.</span>
                  <span className="wmd-strip__symbol">{pollutant.symbol}</span>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </section>
  );
}
