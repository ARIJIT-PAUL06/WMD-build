import React from 'react';
import AppFooter from '../../Footer/AppFooter';

/**
 * WmdFooter - Shared Environmental Intelligence Footer integration for Documentary
 * Implements strict GSAP animation hooks and existing test IDs:
 * - #wmd-footer
 * - .documentary-footer
 * - .doc-credo-line-1, 2, 3
 * - #doc-back-cargo-btn
 * - #doc-return-to-story-cta
 */
export default function WmdFooter({ onBack }) {
  return (
    <AppFooter
      id="wmd-footer"
      className="documentary-footer"
      onBackToCargo={onBack}
      currentRoute="pollutants"
    />
  );
}
