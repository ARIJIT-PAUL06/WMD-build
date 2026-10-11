import express from 'express';
import { getAllDirectoryFacilities } from '../advisoryDispatchService.js';
import { getSchoolAqiForecast } from '../sagemakerService.js';
import { getModelEvaluation } from '../modelEvaluationService.js';

const router = express.Router();

const PUBLIC_FACILITY_FIELDS = [
  'id', 'name', 'facilityClass', 'type', 'category', 'city', 'district', 'locality', 'lat', 'lon', 'gridId', 'studentCount', 'bedCount'
];

function projectPublicFacility(fac) {
  const projected = {};
  for (const field of PUBLIC_FACILITY_FIELDS) {
    if (fac[field] !== undefined) projected[field] = fac[field];
  }
  return projected;
}

/**
 * Get all Delhi schools, universities, and hospitals with verified coordinates & grid blocks
 */
router.get('/api/directory/facilities', (req, res) => {
  try {
    const { district, facilityClass, gridId } = req.query;
    let data = getAllDirectoryFacilities();
    let facilities = data.facilities;

    if (district) {
      facilities = facilities.filter(f => f.district && f.district.toLowerCase().includes(district.toLowerCase()));
    }
    if (facilityClass) {
      facilities = facilities.filter(f => f.facilityClass === facilityClass);
    }
    if (gridId) {
      facilities = facilities.filter(f => f.gridId === gridId);
    }

    res.json({
      success: true,
      totalCount: facilities.length,
      nodalAuthorities: data.nodalAuthorities,
      facilities: facilities.map(projectPublicFacility)
    });
  } catch (err) {
    console.error('[API /api/directory/facilities Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 48-Hour Continuous Atmospheric Forecasting Engine
 * Physics-grounded machine learning inference (SageMaker / Local fallback)
 */
router.get('/api/sagemaker/forecast', async (req, res) => {
  try {
    const {
      schoolId,
      schoolName,
      facilityId,
      facilityName,
      lat,
      lon,
      basePm25,
      threshold
    } = req.query;

    const parsedBase = (basePm25 !== undefined && basePm25 !== null && basePm25 !== '')
      ? parseInt(basePm25, 10)
      : undefined;

    const forecast = await getSchoolAqiForecast({
      schoolId: schoolId || facilityId || 'delhi_regional',
      schoolName: schoolName || facilityName || 'Delhi NCR Regional Airshed',
      facilityId: facilityId || schoolId || 'delhi_regional',
      facilityName: facilityName || schoolName || 'Delhi NCR Regional Airshed',
      lat: lat ? parseFloat(lat) : 28.6139,
      lon: lon ? parseFloat(lon) : 77.2090,
      basePm25: parsedBase,
      threshold: threshold ? parseInt(threshold, 10) : 60
    });

    res.json({ success: true, ...forecast });
  } catch (err) {
    console.error('[API /api/sagemaker/forecast Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Held-out test-set diagnostics for the deployed 48h forecast model
 * (calibration pairs, per-horizon errors, residual bands, split importance), computed from the model + data files.
 */
router.get('/api/model-evaluation', async (req, res) => {
  try {
    res.json(await getModelEvaluation());
  } catch (err) {
    console.error('[API /api/model-evaluation Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
