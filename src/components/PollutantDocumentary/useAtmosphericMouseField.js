/**
 * useAtmosphericMouseField.js
 * VayuVitals - Mouse-Reactive Atmospheric Interaction System
 *
 * Implements subtle, organic air disturbance physics across the hero:
 * - Tracks cursor motion within the hero viewport
 * - Calculates distance-based proximity to the central measurement gauge
 * - Smooth exponential damping (lerp) via requestAnimationFrame
 * - Injects GPU-accelerated CSS custom variables on the hero element:
 *   --doc-mouse-norm-x: normalized horizontal delta (-1 to 1)
 *   --doc-mouse-norm-y: normalized vertical delta (-1 to 1)
 *   --doc-hero-prox: proximity factor to central gauge (0 to 1)
 *   --doc-tilt-x: 3D perspective tilt on X axis
 *   --doc-tilt-y: 3D perspective tilt on Y axis
 *   --doc-mouse-px: pixel X offset for atmospheric disturbance field
 *   --doc-mouse-py: pixel Y offset for atmospheric disturbance field
 *   --doc-mouse-active: 0 to 1 transition for cursor presence
 * - Updates mouseStateRef for HeroAtmosphericCanvas particle displacement
 * - 100% desktop/fine-pointer gated, disabled on mobile/touch & prefers-reduced-motion
 * - Smoothly relaxes to neutral state when cursor exits or window blurs
 */

import { useEffect, useRef } from 'react';

export function useAtmosphericMouseField(heroRef, mouseStateRef) {
  useEffect(() => {
    if (typeof window === 'undefined' || !heroRef.current) return;

    // Check reduced motion
    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Desktop only: check for hover capability & fine pointer (bypasses mobile/touch)
    const canHoverFine =
      window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHoverFine) return;

    const heroEl = heroRef.current;

    // Target coordinates & states
    let targetNormX = 0;
    let targetNormY = 0;
    let targetProx = 0;
    let targetPx = -1000;
    let targetPy = -1000;
    let targetActive = 0;

    // Current smoothed coordinates & states
    let currNormX = 0;
    let currNormY = 0;
    let currProx = 0;
    let currPx = -1000;
    let currPy = -1000;
    let currActive = 0;

    let rafId = null;
    let isTracking = false;

    // Center cache of central measurement gauge
    let gaugeCenter = { x: 0, y: 0 };

    const updateGaugeCenter = () => {
      if (!heroEl) return;
      const gaugeEl = heroEl.querySelector('#documentary-central-measurement');
      const heroRect = heroEl.getBoundingClientRect();
      if (gaugeEl) {
        const gaugeRect = gaugeEl.getBoundingClientRect();
        gaugeCenter.x = gaugeRect.left + gaugeRect.width / 2 - heroRect.left;
        gaugeCenter.y = gaugeRect.top + gaugeRect.height / 2 - heroRect.top;
      } else {
        gaugeCenter.x = heroRect.width / 2;
        gaugeCenter.y = heroRect.height * 0.45;
      }
    };

    updateGaugeCenter();

    // Lerp smoothing loop
    const tick = () => {
      // Exponential smoothing factor (0.075 provides buttery cinematic damping)
      const lerpFactor = 0.075;

      currNormX += (targetNormX - currNormX) * lerpFactor;
      currNormY += (targetNormY - currNormY) * lerpFactor;
      currProx += (targetProx - currProx) * lerpFactor;
      currActive += (targetActive - currActive) * lerpFactor;

      if (currPx === -1000 && targetPx !== -1000) {
        currPx = targetPx;
        currPy = targetPy;
      } else if (targetPx !== -1000) {
        currPx += (targetPx - currPx) * lerpFactor;
        currPy += (targetPy - currPy) * lerpFactor;
      }

      // Max tilt angle is 3.2 degrees, scaled by proximity for physical focal depth
      const maxTiltDeg = 3.2;
      const tiltX = (currNormY * -maxTiltDeg * (0.35 + 0.65 * currProx)).toFixed(2);
      const tiltY = (currNormX * maxTiltDeg * (0.35 + 0.65 * currProx)).toFixed(2);

      // Injected CSS variables on the hero element
      heroEl.style.setProperty('--doc-mouse-norm-x', currNormX.toFixed(4));
      heroEl.style.setProperty('--doc-mouse-norm-y', currNormY.toFixed(4));
      heroEl.style.setProperty('--doc-hero-prox', currProx.toFixed(4));
      heroEl.style.setProperty('--doc-tilt-x', `${tiltX}deg`);
      heroEl.style.setProperty('--doc-tilt-y', `${tiltY}deg`);
      heroEl.style.setProperty('--doc-mouse-px', `${currPx.toFixed(1)}px`);
      heroEl.style.setProperty('--doc-mouse-py', `${currPy.toFixed(1)}px`);
      heroEl.style.setProperty('--doc-mouse-active', currActive.toFixed(3));

      // Synchronize shared mouse state for HeroAtmosphericCanvas
      if (mouseStateRef && mouseStateRef.current) {
        mouseStateRef.current.x = currPx;
        mouseStateRef.current.y = currPy;
        mouseStateRef.current.normX = currNormX;
        mouseStateRef.current.normY = currNormY;
        mouseStateRef.current.proximity = currProx;
        mouseStateRef.current.active = currActive > 0.05;
      }

      // Continue RAF loop if tracking or if values have not yet fully settled to zero
      const isSettling =
        Math.abs(currNormX) > 0.0008 ||
        Math.abs(currNormY) > 0.0008 ||
        Math.abs(currProx) > 0.0008 ||
        currActive > 0.005;

      if (isTracking || isSettling) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const startRafIfNeeded = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const handleMouseMove = (e) => {
      const rect = heroEl.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      // Coordinate relative to hero
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      targetPx = relX;
      targetPy = relY;
      targetActive = 1;
      isTracking = true;

      // Normalized coordinates from center (-1 to 1)
      const halfW = rect.width / 2 || 600;
      const halfH = rect.height / 2 || 400;
      targetNormX = Math.max(-1, Math.min(1, (relX - halfW) / halfW));
      targetNormY = Math.max(-1, Math.min(1, (relY - halfH) / halfH));

      // Distance to central measurement gauge
      const distToGauge = Math.hypot(relX - gaugeCenter.x, relY - gaugeCenter.y);
      // Maximum influence reach is 460px
      const maxReach = 460;
      if (distToGauge >= maxReach) {
        targetProx = 0;
      } else {
        // Smooth non-linear proximity falloff (cubic ease-out)
        const ratio = 1 - distToGauge / maxReach;
        targetProx = Math.pow(ratio, 1.35);
      }

      startRafIfNeeded();
    };

    const handleMouseLeave = () => {
      isTracking = false;
      targetNormX = 0;
      targetNormY = 0;
      targetProx = 0;
      targetActive = 0;
      startRafIfNeeded();
    };

    const handleWindowResize = () => {
      updateGaugeCenter();
    };

    heroEl.addEventListener('mousemove', handleMouseMove, { passive: true });
    heroEl.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('resize', handleWindowResize, { passive: true });
    window.addEventListener('blur', handleMouseLeave, { passive: true });

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      heroEl.removeEventListener('mousemove', handleMouseMove);
      heroEl.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('blur', handleMouseLeave);

      // Clean up injected CSS variables
      heroEl.style.removeProperty('--doc-mouse-norm-x');
      heroEl.style.removeProperty('--doc-mouse-norm-y');
      heroEl.style.removeProperty('--doc-hero-prox');
      heroEl.style.removeProperty('--doc-tilt-x');
      heroEl.style.removeProperty('--doc-tilt-y');
      heroEl.style.removeProperty('--doc-mouse-px');
      heroEl.style.removeProperty('--doc-mouse-py');
      heroEl.style.removeProperty('--doc-mouse-active');

      if (mouseStateRef && mouseStateRef.current) {
        mouseStateRef.current.active = false;
        mouseStateRef.current.proximity = 0;
      }
    };
  }, [heroRef, mouseStateRef]);
}

export default useAtmosphericMouseField;
