import React from 'react';
import WmdBarChart from './WmdBarChart';
import WmdContourMap from './WmdContourMap';

/**
 * WmdImpactRow - [stored readings] [exposure surface] | [key statistics]
 * Every number is either from pollutantDocumentaries.js `globalStats` (each with a cited
 * source, listed under the table), the live API, or /api/history. Missing values show "—".
 */
export default function WmdImpactRow({
  pollutantData,
  currentReading = { value: null, isBaseline: false, label: 'No reading available' },
  stations = [],
  dataSourceLabel,
  isBaseline = false,
  lastUpdated,
  readingHistory,
}) {
  const unit = pollutantData?.unit || 'µg/m³';
  const symbol = pollutantData?.symbol || 'PM2.5';
  const naaqsLimit = pollutantData?.naaqsLimit;
  const stats = pollutantData?.globalStats || [];

  // Reference layout: two headline figures, the current value, then the WHO guideline.
  const headline = stats.slice(0, 2);
  const guideline = stats.find((s) => /WHO|ADVISORY/i.test(s.label)) || null;
  const rows = [
    ...headline.map((s) => ({ key: s.label, label: s.label, value: s.value, note: s.detail })),
    {
      key: 'current',
      label: currentReading.isBaseline ? 'REFERENCE VALUE' : 'CURRENT CONCENTRATION',
      value:
        typeof currentReading.value === 'number'
          ? `${Math.round(currentReading.value * 10) / 10} ${unit}`
          : '—',
      note: currentReading.label,
      tag: currentReading.isBaseline ? 'not live' : null,
    },
    guideline
      ? { key: guideline.label, label: guideline.label, value: guideline.value, note: guideline.detail }
      : { key: 'who', label: 'WHO GUIDELINE', value: '—', note: 'Not in data file' },
  ];
  const cited = [...headline, guideline].filter((s) => s?.sourceLabel);

  return (
    <section id="wmd-impact-row" className="wmd-impact-row" aria-label={`${symbol} readings and key statistics`}>
      <div className="wmd-impact-row__inner">
        <div className="wmd-impact-row__col wmd-impact-row__col--chart">
          <WmdBarChart
            history={readingHistory}
            pollutantKey={pollutantData.id}
            symbol={symbol}
            naaqsLimit={naaqsLimit}
            unit={unit}
          />
        </div>

        <div className="wmd-impact-row__col wmd-impact-row__col--contour">
          <WmdContourMap
            stations={stations}
            pollutantKey={pollutantData.id}
            symbol={symbol}
            unit={unit}
            dataSourceLabel={dataSourceLabel}
            isBaseline={isBaseline}
            lastUpdated={lastUpdated}
          />
        </div>

        <div className="wmd-impact-row__divider" aria-hidden="true" />

        <div className="wmd-impact-row__col wmd-impact-row__col--stats">
          <div className="wmd-impact-stats">
            <div className="wmd-impact-stats__header">
              <h3 className="wmd-impact-stats__title">KEY STATISTICS</h3>
              <div className="wmd-impact-stats__hairline" />
            </div>

            <dl className="wmd-impact-stats__table">
              {rows.map((row) => (
                <div key={row.key} className="wmd-impact-stats__row" title={row.note || undefined}>
                  <dt className="wmd-impact-stats__label">{row.label}</dt>
                  <dd className="wmd-impact-stats__value">
                    {row.value}
                    {row.tag && <span className="wmd-impact-stats__sub-tag"> ({row.tag})</span>}
                  </dd>
                </div>
              ))}
            </dl>

            {cited.length > 0 && (
              <div className="wmd-impact-stats__footnote">
                <p>
                  SOURCES:{' '}
                  {cited.map((s, idx) => (
                    <React.Fragment key={s.label}>
                      {idx > 0 && '; '}
                      {s.sourceUrl ? (
                        <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">
                          {s.sourceLabel}
                        </a>
                      ) : (
                        s.sourceLabel
                      )}
                    </React.Fragment>
                  ))}
                  . Current value: {currentReading.label}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
