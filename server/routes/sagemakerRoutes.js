import express from 'express';
import { getAllDirectoryFacilities } from '../advisoryDispatchService.js';
import { getSchoolAqiForecast } from '../sagemakerService.js';

const router = express.Router();

/**
 * Get all Delhi schools, universities, and hospitals with verified emails & grid blocks
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
      facilities
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

    const forecast = await getSchoolAqiForecast({
      schoolId: schoolId || facilityId || 'dps_rk_puram',
      schoolName: schoolName || facilityName || 'Delhi Public School, R.K. Puram',
      facilityId: facilityId || schoolId || 'dps_rk_puram',
      facilityName: facilityName || schoolName || 'Delhi Public School, R.K. Puram',
      lat: lat ? parseFloat(lat) : 28.5672,
      lon: lon ? parseFloat(lon) : 77.1741,
      basePm25: basePm25 ? parseInt(basePm25, 10) : 145,
      threshold: threshold ? parseInt(threshold, 10) : 60
    });

    res.json({ success: true, ...forecast });
  } catch (err) {
    console.error('[API /api/sagemaker/forecast Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
