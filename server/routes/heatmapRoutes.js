import express from 'express';
import {
  getDelhiHeatmapData,
  getUniversalHeatmapData,
  getIndiaNationalHeatmapData
} from '../fusionAqiService.js';

const router = express.Router();

/**
 * Real-Time India National Subcontinent Spatial Heatmap Endpoint
 * Integrates 77 CAAQMS & ground monitoring stations spanning all states and territories
 */
router.get('/api/india-heatmap', async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : null;
    const lon = req.query.lon ? Number(req.query.lon) : null;
    const data = await getIndiaNationalHeatmapData(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('[API /api/india-heatmap Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Real-Time Delhi Spatial Heatmap & Fusion Algorithm Endpoint
 */
router.get('/api/delhi-heatmap', async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : 28.7495;
    const lon = req.query.lon ? Number(req.query.lon) : 77.1171;
    const data = await getDelhiHeatmapData(lat, lon);
    res.json(data);
  } catch (err) {
    console.error('[API /api/delhi-heatmap Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Universal Multi-City & Global Regional Heatmap Endpoint
 * Works for any city, urban basin, or arbitrary GPS coordinate worldwide
 */
router.get('/api/region-heatmap', async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : 28.7495;
    const lon = req.query.lon ? Number(req.query.lon) : 77.1171;
    const city = req.query.city || 'Delhi';
    const data = await getUniversalHeatmapData(lat, lon, city);
    res.json(data);
  } catch (err) {
    console.error('[API /api/region-heatmap Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
