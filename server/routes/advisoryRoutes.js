import express from 'express';
import { generateGeminiAdvisory } from '../geminiService.js';
import { generateBedrockAdvisory } from '../awsServices.js';
import {
  generate630Advisory,
  testDispatch630Advisory,
  evaluateMorningAdvisories,
  craftAndDispatchMidDayEmergency
} from '../advisoryDispatchService.js';
import { computeLlmLimiter, requireAdminKey, disallowHttpDispatchInProd } from '../middleware/authAndRateLimit.js';
import { requireAuth } from '../authMiddleware.js';

const router = express.Router();

/**
 * Token-Optimized Google Gemini AI Health & Commute Advisory (Citizen login required)
 */
router.post('/api/gemini-advisory', requireAuth(), computeLlmLimiter, async (req, res) => {
  try {
    const metrics = req.body;
    if (!metrics || metrics.aqi === undefined) {
      return res.status(400).json({ success: false, error: 'Metrics payload with aqi is required' });
    }
    const result = await generateGeminiAdvisory(metrics);
    res.json(result);
  } catch (err) {
    console.error('[API /api/gemini-advisory Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Standalone Amazon Bedrock Advisory Generator (Citizen login required)
 */
router.post('/api/bedrock-advisory', requireAuth(), computeLlmLimiter, async (req, res) => {
  try {
    const metrics = req.body;
    if (!metrics || !metrics.city) {
      return res.status(400).json({ success: false, error: 'Metrics payload with city is required' });
    }

    const result = await generateBedrockAdvisory(metrics);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API /api/bedrock-advisory Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Preview 6:30 AM Advisory bulletin for any facility
 */
router.get('/api/advisory/preview-630', async (req, res) => {
  try {
    const { facilityId = 'dps_rk_puram', basePm25 } = req.query;
    const advisory = await generate630Advisory({
      facilityId,
      basePm25: basePm25 ? parseInt(basePm25, 10) : 175
    });
    res.json({ success: true, advisory });
  } catch (err) {
    console.error('[API /api/advisory/preview-630 Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Test or simulate dispatching the 6:30 AM bulletin
 */
router.post('/api/advisory/test-dispatch', disallowHttpDispatchInProd, requireAdminKey, async (req, res) => {
  try {
    const { facilityId = 'dps_rk_puram', testEmail = null, isSandbox = true, dispatchViaSes = false } = req.body;
    const result = await testDispatch630Advisory({
      facilityId,
      testEmail,
      isSandbox: isSandbox !== false,
      dispatchViaSes: Boolean(dispatchViaSes)
    });
    res.json(result);
  } catch (err) {
    console.error('[API /api/advisory/test-dispatch Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Threshold-gated 6:30 AM Advisory check (suppressed on clean summer/monsoon days)
 */
router.post('/api/advisory/evaluate-morning', disallowHttpDispatchInProd, requireAdminKey, async (req, res) => {
  try {
    const { facilityId = 'dps_rk_puram', thresholdPm25 = parseInt(process.env.ADVISORY_THRESHOLD_PM25, 10) || 75, basePm25, testEmail, isSandbox = true } = req.body;
    const result = await evaluateMorningAdvisories({
      facilityId,
      thresholdPm25: Number(thresholdPm25),
      basePm25: basePm25 ? Number(basePm25) : null,
      testEmail,
      isSandbox
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API /api/advisory/evaluate-morning Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Gemini-Crafted 12:00 PM Mid-Day Emergency Flash Alert (for sudden unexpected spikes)
 */
router.post('/api/advisory/emergency-midday', disallowHttpDispatchInProd, requireAdminKey, computeLlmLimiter, async (req, res) => {
  try {
    const { facilityId = 'dps_rk_puram', currentPm25 = 295, anomalyType, testEmail, isSandbox = true, dispatchViaSes = false } = req.body;
    const result = await craftAndDispatchMidDayEmergency({
      facilityId,
      currentPm25: Number(currentPm25),
      anomalyType: anomalyType || 'Sudden Mid-Day Dust & Local Thermal Stagnation',
      testEmail,
      isSandbox,
      dispatchViaSes: Boolean(dispatchViaSes)
    });
    res.json(result);
  } catch (err) {
    console.error('[API /api/advisory/emergency-midday Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
