/**
 * documentaryMapService.js
 * VayuVitals - Shared Mapbox Instance, Configuration & Request Deduplication Service
 *
 * Implements a persistent, shared Mapbox singleton host and in-flight request deduplication
 * for the 7 VayuVitals pollutant documentary pages:
 *
 * 1. Single Mapbox instance across all 7 routes:
 *    - Reuses the underlying Mapbox GL JS map instance when switching routes.
 *    - Avoids destroying and re-instantiating WebGL contexts.
 *    - Manages attaching/detaching the persistent DOM canvas element between React mounts.
 *
 * 2. In-flight request deduplication and Promise cache:
 *    - Deduplicates concurrent or rapid requests for identical endpoints (e.g. /api/delhi-heatmap).
 *    - Caches successful telemetry & location metadata for configurable TTL.
 *    - Automatically purges failed or rejected requests so subsequent calls can retry.
 *
 * 3. Dynamic camera and marker updates:
 *    - Repositions marker and smoothly eases map center when selected station coordinates change.
 *    - Never fakes map tiles, coordinates, or telemetry.
 */

import mapboxgl from 'mapbox-gl';
import { MAPBOX_DARK_STYLE } from '../components/Heatmap/heatmapConstants.js';
import { apiFetch } from '../utils/apiFetch.js';

// ============================================================================
// 1. IN-FLIGHT REQUEST DEDUPLICATION & MULTI-TIER METADATA CACHE
// ============================================================================

/** In-flight Promise deduplication map: key -> Promise */
const inFlightRequests = new Map();

/** In-memory response cache map: key -> { data, timestamp } */
const responseCache = new Map();

/** Default cache TTL: 60 seconds for dynamic environmental telemetry */
const DEFAULT_CACHE_TTL_MS = 60 * 1000;

/** Storage prefix for session cache */
const STORAGE_CACHE_PREFIX = 'vv_map_data_cache_';

/**
 * Safely read cached response from memory or sessionStorage
 */
function readFromCache(endpoint, ttlMs) {
  const now = Date.now();

  // Tier 1: In-memory cache
  if (responseCache.has(endpoint)) {
    const cached = responseCache.get(endpoint);
    if (now - cached.timestamp < ttlMs) {
      return cached.data;
    }
    responseCache.delete(endpoint);
  }

  // Tier 2: sessionStorage (persists across page navigations/refreshes)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const storedRaw = window.sessionStorage.getItem(STORAGE_CACHE_PREFIX + endpoint);
      if (storedRaw) {
        const stored = JSON.parse(storedRaw);
        if (stored && stored.timestamp && (now - stored.timestamp < ttlMs)) {
          // Promote back to in-memory cache
          responseCache.set(endpoint, stored);
          return stored.data;
        }
        window.sessionStorage.removeItem(STORAGE_CACHE_PREFIX + endpoint);
      }
    } catch (e) {
      // Ignore storage access errors (private browsing / quota)
    }
  }

  return null;
}

/**
 * Safely write fresh response to memory and sessionStorage
 */
function writeToCache(endpoint, data) {
  const cacheEntry = {
    data,
    timestamp: Date.now(),
  };

  // Write to memory
  responseCache.set(endpoint, cacheEntry);

  // Write to sessionStorage (never store sensitive tokens)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(STORAGE_CACHE_PREFIX + endpoint, JSON.stringify(cacheEntry));
    } catch (e) {
      // Storage quota or restriction - graceful no-op
    }
  }
}

/**
 * Fetch deduplicated application-owned JSON data with TTL and session caching.
 * Concurrent requests for the same URL share the exact same pending Promise.
 *
 * @param {string} endpoint - API path or URL
 * @param {Object} [options] - Fetch options and cache config
 * @param {number} [options.ttlMs] - Cache lifetime in ms (default 60s)
 * @param {boolean} [options.forceRefresh] - Invalidate cache and fetch anew
 * @returns {Promise<any>}
 */
export async function fetchDeduplicatedJson(endpoint, options = {}) {
  const { ttlMs = DEFAULT_CACHE_TTL_MS, forceRefresh = false } = options;

  // 1. Check existing fresh cache (in-memory + sessionStorage)
  if (!forceRefresh) {
    const cachedData = readFromCache(endpoint, ttlMs);
    if (cachedData != null) {
      return cachedData;
    }
  }

  // 2. Share in-flight Promise if request is already active
  if (inFlightRequests.has(endpoint)) {
    return inFlightRequests.get(endpoint);
  }

  // 3. Initiate request and register in in-flight cache
  const requestPromise = (async () => {
    try {
      const res = await apiFetch(endpoint);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${endpoint}`);
      }
      const data = await res.json();
      // Store in multi-tier response cache
      writeToCache(endpoint, data);
      return data;
    } finally {
      // Always remove from in-flight deduplication once completed or failed
      inFlightRequests.delete(endpoint);
    }
  })();

  inFlightRequests.set(endpoint, requestPromise);
  return requestPromise;
}

/**
 * Invalidate cached response for a given endpoint or all cached responses.
 * @param {string} [endpoint] - Specific endpoint or omit to clear all
 */
export function invalidateResponseCache(endpoint) {
  if (endpoint) {
    responseCache.delete(endpoint);
    inFlightRequests.delete(endpoint);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(STORAGE_CACHE_PREFIX + endpoint);
      } catch (e) { }
    }
  } else {
    responseCache.clear();
    inFlightRequests.clear();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const keysToRemove = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key && key.startsWith(STORAGE_CACHE_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => window.sessionStorage.removeItem(k));
      } catch (e) { }
    }
  }
}

// ============================================================================
// 2. SHARED MAPBOX HOST & SINGLETON INSTANCE SERVICE
// ============================================================================

class DocumentaryMapService {
  constructor() {
    this.map = null;
    this.marker = null;
    this.hostElement = null; // Detached persistent DOM container hosting map canvas
    this.currentContainer = null; // Current active React DOM mount point
    this.activeCoords = { lng: 77.3158, lat: 28.6476 };
    this.isInitializing = false;
    this.initError = null;
    this.resizeObserver = null;
    this.markerPingEl = null;
    this.markerCoreEl = null;
  }

  /**
   * Get configured Mapbox access token
   */
  getToken() {
    return (
      (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_MAPBOX_TOKEN : '') ||
      mapboxgl.accessToken ||
      ''
    );
  }

  /**
   * Check WebGL support
   */
  isSupported() {
    return typeof mapboxgl.supported === 'function' ? mapboxgl.supported() : true;
  }

  /**
   * Ensure the shared Mapbox host and map instance are created.
   * If already initialized, attaches the persistent host element to targetContainer.
   *
   * @param {HTMLElement} targetContainer - React container element
   * @param {Object} options
   * @param {number} options.longitude
   * @param {number} options.latitude
   * @param {string} options.locationName
   * @param {string} options.accentColor
   * @returns {{ map: mapboxgl.Map | null, error: string | null }}
   */
  mountMap(targetContainer, { longitude, latitude, locationName, accentColor }) {
    if (!targetContainer) return { map: null, error: 'Target container missing' };

    const token = this.getToken();
    if (!token) {
      return { map: null, error: 'Mapbox access token is required (VITE_MAPBOX_TOKEN)' };
    }

    if (!this.isSupported()) {
      return { map: null, error: 'WebGL is disabled or unsupported on this device' };
    }

    mapboxgl.accessToken = token;

    const validLng = Number.isFinite(Number(longitude)) ? Number(longitude) : 77.0510;
    const validLat = Number.isFinite(Number(latitude)) ? Number(latitude) : 28.7762;

    // CASE 1: Map instance already exists - reparent persistent hostElement
    if (this.map && this.hostElement) {
      this.currentContainer = targetContainer;

      // Transfer host element into new targetContainer if not already inside it
      if (this.hostElement.parentElement !== targetContainer) {
        targetContainer.innerHTML = '';
        targetContainer.appendChild(this.hostElement);
      }

      // Immediately trigger resize, then schedule a follow-up after DOM reflow
      if (this.map) {
        this.map.resize();
        requestAnimationFrame(() => {
          if (this.map) {
            this.map.resize();
          }
        });
      }

      // Update coordinates & marker accent
      this.updateLocation(validLng, validLat, locationName, accentColor);
      return { map: this.map, error: null };
    }

    // CASE 2: Initialize for the first time
    try {
      // Create persistent host element that will survive React route re-mounts
      this.hostElement = document.createElement('div');
      this.hostElement.className = 'doc-shared-mapbox-host';
      this.hostElement.style.width = '100%';
      this.hostElement.style.height = '100%';
      this.hostElement.style.position = 'relative';

      targetContainer.innerHTML = '';
      targetContainer.appendChild(this.hostElement);
      this.currentContainer = targetContainer;

      this.activeCoords = { lng: validLng, lat: validLat };

      const map = new mapboxgl.Map({
        container: this.hostElement,
        style: MAPBOX_DARK_STYLE,
        center: [validLng, validLat],
        zoom: 12.2,
        minZoom: 8,
        maxZoom: 18,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
        interactive: true,
        scrollZoom: false, // Prevent hijacking surrounding page scroll
        dragPan: true,
        dragRotate: false,
        touchZoomRotate: true,
        doubleClickZoom: true,
        cooperativeGestures: false,
      });

      // Compact attribution
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

      // Compact navigation control
      const navControl = new mapboxgl.NavigationControl({
        showCompass: false,
        showZoom: true,
        visualizePitch: false,
      });
      map.addControl(navControl, 'top-right');

      // Marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'doc-spatial-marker-node';
      markerEl.setAttribute('role', 'img');
      markerEl.setAttribute('aria-label', `Monitoring Receptor: ${locationName || 'Delhi'}`);

      this.markerPingEl = document.createElement('span');
      this.markerPingEl.className = 'doc-spatial-marker-ping';
      this.markerPingEl.style.borderColor = accentColor || '#f97316';

      this.markerCoreEl = document.createElement('span');
      this.markerCoreEl.className = 'doc-spatial-marker-core';
      this.markerCoreEl.style.backgroundColor = accentColor || '#f97316';

      markerEl.appendChild(this.markerPingEl);
      markerEl.appendChild(this.markerCoreEl);

      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: 'center',
      })
        .setLngLat([validLng, validLat])
        .addTo(map);

      this.map = map;
      this.marker = marker;

      // Handle ResizeObserver on active container
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.map && this.hostElement && this.hostElement.clientWidth > 0) {
            this.map.resize();
          }
        });
        this.resizeObserver.observe(this.hostElement);
      }

      return { map: this.map, error: null };
    } catch (err) {
      console.warn('[documentaryMapService] Failed to initialize Mapbox instance:', err);
      this.initError = err?.message || 'Unable to initialize Mapbox WebGL engine';
      return { map: null, error: this.initError };
    }
  }

  /**
   * Update map position and marker coordinates smoothly
   */
  updateLocation(lng, lat, locationName, accentColor) {
    if (!this.map) return;

    const validLng = Number.isFinite(Number(lng)) ? Number(lng) : 77.0510;
    const validLat = Number.isFinite(Number(lat)) ? Number(lat) : 28.7762;

    const currCenter = this.map.getCenter();
    const dist = Math.hypot(currCenter.lng - validLng, currCenter.lat - validLat);

    if (dist > 0.0001) {
      this.map.easeTo({
        center: [validLng, validLat],
        duration: 800,
        essential: true,
      });
      this.activeCoords = { lng: validLng, lat: validLat };
    }

    if (this.marker) {
      this.marker.setLngLat([validLng, validLat]);
      if (locationName) {
        this.marker.getElement().setAttribute('aria-label', `Monitoring Receptor: ${locationName}`);
      }
    }

    if (accentColor) {
      if (this.markerPingEl) this.markerPingEl.style.borderColor = accentColor;
      if (this.markerCoreEl) this.markerCoreEl.style.backgroundColor = accentColor;
    }
  }

  /**
   * Called when a component unmounts. Detaches the hostElement cleanly
   * while keeping the map instance and WebGL context alive for the next route.
   */
  detachFromContainer(targetContainer) {
    if (this.currentContainer === targetContainer) {
      if (this.hostElement && this.hostElement.parentElement === targetContainer) {
        targetContainer.removeChild(this.hostElement);
      }
      this.currentContainer = null;
    }
  }

  /**
   * Completely destroy the map instance if explicitly needed (e.g. app unmount or reset).
   */
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.hostElement && this.hostElement.parentElement) {
      this.hostElement.parentElement.removeChild(this.hostElement);
    }
    this.hostElement = null;
    this.currentContainer = null;
    this.markerPingEl = null;
    this.markerCoreEl = null;
  }
}

// Export singleton instance
export const documentaryMapService = new DocumentaryMapService();
