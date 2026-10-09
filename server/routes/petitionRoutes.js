import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { aggregateSchoolEvidence, generateDraftPetition, getSchoolsDirectory } from '../evidenceService.js';
import { getSchoolAqiForecast } from '../sagemakerService.js';
import { findGridForCoordinates } from '../gridTelemetryService.js';
import { rateLimitPetition, rateLimitPerUser } from '../middleware/authAndRateLimit.js';
import { requireUser, requireSchoolAdmin } from '../authMiddleware.js';
import {
  createPetition,
  listPetitionsByUser,
  listPetitionsBySchool,
  updatePetitionStatus,
  deletePetition,
  deleteAllPetitionsForUser,
  VALID_PETITION_STATUSES
} from '../petitionsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * Ensures AI polishing did not alter, add, or strip empirical numbers or calendar dates.
 * Enforces exact bidirectional whole-number match per P5.1.
 */
export function verifyNumbersPreserved(originalText, polishedText) {
  if (!originalText || !polishedText) return false;
  const origMatches = originalText.match(/\b\d+\b/g) || [];
  const polishedMatches = polishedText.match(/\b\d+\b/g) || [];

  const origCounts = {};
  for (const n of origMatches) {
    origCounts[n] = (origCounts[n] || 0) + 1;
  }

  const polishedCounts = {};
  for (const n of polishedMatches) {
    polishedCounts[n] = (polishedCounts[n] || 0) + 1;
  }

  // Reject if any number in original disappeared or count changed
  for (const [num, count] of Object.entries(origCounts)) {
    if ((polishedCounts[num] || 0) !== count) {
      return false;
    }
  }

  // Reject if any new number was added in polished text
  for (const [num, count] of Object.entries(polishedCounts)) {
    if ((origCounts[num] || 0) !== count) {
      return false;
    }
  }

  return true;
}

export const SENDER_PLACEHOLDERS = [
  '[YOUR NAME]',
  '[YOUR ROLE / DESIGNATION]',
  '[YOUR PHONE / EMAIL]'
];

export function verifyPlaceholdersPreserved(originalText, polishedText) {
  if (!originalText || !polishedText) return false;
  for (const placeholder of SENDER_PLACEHOLDERS) {
    if (originalText.includes(placeholder) && !polishedText.includes(placeholder)) {
      return false;
    }
  }
  return true;
}

/**
 * Step 0: Read-only authorities directory
 */
router.get('/api/petition/authorities', rateLimitPetition(60, 60000), (req, res) => {
  try {
    const pCandidates = [
      path.join(__dirname, '../../src/data/authoritiesConfig.json'),
      path.join(__dirname, '../src/data/authoritiesConfig.json'),
      path.join(process.cwd(), 'src/data/authoritiesConfig.json'),
      path.join('/tmp', 'authoritiesConfig.json')
    ];
    for (const p of pCandidates) {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        return res.json({ success: true, ...raw });
      }
    }
    res.status(404).json({ success: false, error: 'Authorities configuration not found on server' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Step 0b: Read-only schools directory search
 */
router.get('/api/petition/schools', rateLimitPetition(60, 60000), (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    const schools = getSchoolsDirectory();

    // Whitelist fields per Fix 11: id, name, locality, district, lat, lon, gridId
    // Strictly removes emails, primaryEmail, phone, and nodalOfficerEmail
    const cleanSchools = schools.map(s => {
      let cellId = s.gridId || null;
      if (!cellId && s.lat != null && s.lon != null) {
        const g = findGridForCoordinates(s.lat, s.lon);
        cellId = g?.grid_id || g?.id || null;
      }
      return {
        id: s.id,
        name: s.name,
        locality: s.locality || '',
        district: s.district || '',
        lat: s.lat,
        lon: s.lon,
        gridId: cellId
      };
    });

    if (!q) {
      return res.json({ success: true, count: cleanSchools.length, schools: cleanSchools.slice(0, 50) });
    }
    const filtered = cleanSchools.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.locality && s.locality.toLowerCase().includes(q)) ||
      (s.district && s.district.toLowerCase().includes(q))
    );
    res.json({ success: true, count: filtered.length, schools: filtered.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Step 1: Pull empirical evidence & school-hour exceedance metrics
 */
router.get('/api/petition/evidence', rateLimitPetition(60, 60000), async (req, res) => {
  try {
    const { schoolName, locality, stationName, stationDistanceKm, days, threshold, gridId } = req.query;
    if (!schoolName && !stationName && !gridId) {
      return res.status(400).json({
        success: false,
        error: 'schoolName or stationName parameter is required'
      });
    }
    const evidence = aggregateSchoolEvidence({
      schoolName,
      locality,
      stationName,
      stationDistanceKm,
      days,
      threshold,
      gridId
    });
    res.json(evidence);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * Step 1b: 48-Hour Machine Learning & SageMaker Air Quality Forecast
 * Provides forward predictive intelligence for morning school hours (07:00 - 13:00)
 */
router.get('/api/petition/forecast', rateLimitPetition(60, 60000), async (req, res) => {
  try {
    const { schoolId, schoolName, lat, lon, threshold } = req.query;

    let targetLat = (lat !== undefined && lat !== null && lat !== '') ? parseFloat(lat) : null;
    let targetLon = (lon !== undefined && lon !== null && lon !== '') ? parseFloat(lon) : null;
    let targetSchoolName = schoolName;

    // If coordinates omitted, resolve schoolId or schoolName against institutional directory
    if ((!targetLat || !targetLon) && (schoolId || schoolName)) {
      const schools = getSchoolsDirectory();
      const qId = (schoolId || '').toLowerCase();
      const qName = (schoolName || '').toLowerCase();
      const matched = schools.find(s =>
        (s.id && s.id.toLowerCase() === qId) ||
        (s.name && s.name.toLowerCase() === qName)
      );
      if (matched && matched.lat && matched.lon) {
        targetLat = parseFloat(matched.lat);
        targetLon = parseFloat(matched.lon);
        targetSchoolName = matched.name;
      }
    }

    if (!targetLat || !targetLon || isNaN(targetLat) || isNaN(targetLon)) {
      return res.status(400).json({
        success: false,
        error: 'GPS coordinates (lat, lon) or a valid schoolId resolving to coordinates are required. Rohini fallback removed.'
      });
    }

    const forecast = await getSchoolAqiForecast({
      schoolId: schoolId || 'school',
      schoolName: targetSchoolName || 'School Area',
      lat: targetLat,
      lon: targetLon,
      threshold: threshold ? parseInt(threshold, 10) : 60
    });
    res.json(forecast);
  } catch (err) {
    console.error('[API /api/petition/forecast Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Step 2: Generate bilingual draft complaint from verified numbers (Requires citizen login)
 */
router.post('/api/petition/generate-draft', requireUser(), rateLimitPerUser(60, 60000), (req, res) => {
  try {
    const {
      evidence,
      authority,
      forecast,
      senderName,
      senderRole,
      senderContact,
      selectedDemands,
      schoolEvidencePackage,
      userActionNote,
      schoolActionNote,
      targetType
    } = req.body || {};
    if (!evidence || !authority) {
      return res.status(400).json({ success: false, error: 'evidence and authority objects are required' });
    }
    const result = generateDraftPetition({
      evidence,
      authority,
      forecast,
      senderName,
      senderRole,
      senderContact,
      selectedDemands,
      schoolEvidencePackage,
      userActionNote: userActionNote || schoolActionNote,
      targetType: targetType || evidence?.targetType
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API /api/petition/generate-draft Error for sub %s]: %s', req.user?.sub, err.message);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * Step 2 (Optional): Tone adjustment via Bedrock (Claude 3 Haiku) or Gemini (Requires citizen login)
 * Returns 503 if no AI provider is configured; preserves all empirical data.
 */
router.post('/api/petition/polish-draft', requireUser(), rateLimitPerUser(15, 60000), async (req, res) => {
  try {
    const { draftText, tone = 'formal', language = 'en' } = req.body || {};
    if (!draftText) {
      return res.status(400).json({ success: false, error: 'draftText is required' });
    }

    const toneDescriptions = {
      formal: 'Strictly formal, respectful, and administrative according to official Indian government grievance etiquette.',
      urgent: 'Urgent and impassioned public health alert emphasizing child respiratory vulnerability and immediate morning action, while maintaining administrative decorum.',
      collaborative: 'Constructive and partnership-oriented, offering school collaboration and civil society coordination with authorities.'
    };

    const toneInstruction = toneDescriptions[tone] || toneDescriptions.formal;
    const langInstruction = language === 'hi'
      ? 'The text is in formal administrative Hindi. Maintain correct Rajbhasha administrative vocabulary and respectful salutations.'
      : 'The text is in English. Maintain standard bureaucratic memorandum style.';

    const systemPrompt = `You are a specialized legal and environmental administrative drafting assistant for educational institutions in India.
Your task is to refine the tone of an official civic grievance letter addressed to municipal and pollution control authorities.

Tone requested: ${toneInstruction}
Language: ${langInstruction}

Strict Guardrails (DO NOT VIOLATE):
1. Do NOT alter, fabricate, or exaggerate any dates, numbers, PM2.5 levels, or station statistics in the draft. Keep all empirical data 100% exact.
2. Do NOT make unsupported medical diagnoses or catastrophic clinical claims. Refer instead to "acute respiratory distress, particulate inhalation risk, and vulnerable pediatric pulmonary health".
3. Maintain the recipient address, subject, specific demands, and sender closing intact.
4. Output ONLY the polished letter text. No meta-commentary, no conversational filler, no markdown wrappers like \`\`\`.`;

    // Try Bedrock first
    try {
      const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
      const region = process.env.AWS_REGION || 'ap-south-1';
      const accessKey = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
      const secretKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
      const clientConfig = { region };
      if (accessKey && secretKey) {
        const sessionToken = accessKey?.startsWith('ASIA') ? process.env.AWS_SESSION_TOKEN : undefined;
        clientConfig.credentials = {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          ...(sessionToken ? { sessionToken } : {})
        };
      }
      const client = new BedrockRuntimeClient(clientConfig);
      const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

      const requestBody = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: draftText }],
        temperature: 0.2
      });

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(requestBody)
      });

      const response = await client.send(command);
      const respData = JSON.parse(new TextDecoder().decode(response.body));
      const polishedText = respData.content?.[0]?.text?.trim();
      if (polishedText) {
        if (!verifyNumbersPreserved(draftText, polishedText)) {
          return res.status(422).json({
            success: false,
            error: 'AI generated draft altered empirical numbers or dates. Polish rejected per AGENTS.md guardrails.',
            mode: 'INTEGRITY_CHECK_FAILED'
          });
        }
        if (!verifyPlaceholdersPreserved(draftText, polishedText)) {
          return res.status(422).json({
            success: false,
            error: 'AI generated draft dropped sender placeholders. Polish rejected per AGENTS.md guardrails.',
            mode: 'INTEGRITY_CHECK_FAILED'
          });
        }
        return res.json({
          success: true,
          polishedText,
          mode: 'AWS_BEDROCK_LIVE',
          model: modelId
        });
      }
    } catch (bedrockErr) {
      console.warn('[Bedrock polish-draft failed, trying Gemini]:', bedrockErr.message);
    }

    // Try Gemini if GEMINI_API_KEY present
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const gRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: draftText }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1500
            }
          }),
          signal: AbortSignal.timeout(8000)
        });
        if (gRes.ok) {
          const gData = await gRes.json();
          const polishedText = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (polishedText) {
            if (!verifyNumbersPreserved(draftText, polishedText)) {
              return res.status(422).json({
                success: false,
                error: 'AI generated draft altered empirical numbers or dates. Polish rejected per AGENTS.md guardrails.',
                mode: 'INTEGRITY_CHECK_FAILED'
              });
            }
            if (!verifyPlaceholdersPreserved(draftText, polishedText)) {
              return res.status(422).json({
                success: false,
                error: 'AI generated draft dropped sender placeholders. Polish rejected per AGENTS.md guardrails.',
                mode: 'INTEGRITY_CHECK_FAILED'
              });
            }
            return res.json({
              success: true,
              polishedText,
              mode: 'GEMINI_AI_LIVE',
              model: 'gemini-2.5-flash'
            });
          }
        }
      } catch (geminiErr) {
        console.warn('[Gemini polish-draft failed]:', geminiErr.message);
      }
    }

    // Return 503 instead of fabricating text with rule-based banners
    return res.status(503).json({
      success: false,
      error: 'AI polishing service is currently unavailable. No AI provider is configured or authorized.',
      mode: 'AI_PROVIDER_UNAVAILABLE'
    });
  } catch (err) {
    console.error('[API /api/petition/polish-draft Error for sub %s]: %s', req.user?.sub, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Step 3: Create & Persist Petition in DynamoDB Petitions Table (Citizen login required)
 * Enforces honest statuses, target validation, server evidence computation, and size limits.
 */
router.post('/api/petitions', requireUser(), rateLimitPerUser(30, 60000), async (req, res) => {
  try {
    const payload = req.body?.petitionData || req.body || {};
    const clientRequestId = req.body?.clientRequestId || payload.clientRequestId || null;

    const savedRecord = await createPetition({
      userSub: req.user.sub,
      petitionData: payload,
      clientRequestId
    });

    const isDuplicate = !!savedRecord.isDuplicate;
    const statusCode = isDuplicate ? 200 : 201;

    res.status(statusCode).json({
      success: true,
      message: isDuplicate
        ? 'Existing petition returned (idempotent request).'
        : 'Petition draft saved in Petitions database.',
      petition: savedRecord,
      ...(isDuplicate ? { isDuplicate: true } : {})
    });
  } catch (err) {
    console.error('[API POST /api/petitions Error for sub %s]: %s', req.user?.sub, err.message);
    const status = err.statusCode || (err.message?.includes('credentials not configured') ? 503 : 500);
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * Step 4: List Petitions Filed by Authenticated Citizen (Citizen login required)
 * Supports pagination with limit and nextToken.
 */
router.get('/api/petitions', requireUser(), rateLimitPerUser(60, 60000), async (req, res) => {
  try {
    const { limit, nextToken } = req.query;
    const { items, nextToken: newNextToken } = await listPetitionsByUser(req.user.sub, {
      limit,
      nextToken
    });

    res.json({
      success: true,
      count: items.length,
      petitions: items,
      nextToken: newNextToken
    });
  } catch (err) {
    console.error('[API GET /api/petitions Error for sub %s]: %s', req.user?.sub, err.message);
    const status = err.statusCode || (err.message?.includes('credentials not configured') ? 503 : 500);
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * Step 5: Update Petition Status (Owner only)
 * Allowed statuses: DRAFT_SAVED, OPENED_IN_MAIL, SHARED, MARKED_AS_SENT
 */
router.patch('/api/petitions/:id/status', requireUser(), rateLimitPerUser(60, 60000), async (req, res) => {
  try {
    const petitionId = req.params.id;
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required.'
      });
    }

    const updated = await updatePetitionStatus({
      userSub: req.user.sub,
      petitionId,
      status
    });

    res.json({
      success: true,
      message: 'Petition status updated.',
      petition: updated
    });
  } catch (err) {
    console.error('[API PATCH /api/petitions/:id/status Error for sub %s]: %s', req.user?.sub, err.message);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * Step 6: Delete a Specific Petition (Owner only)
 */
router.delete('/api/petitions/:id', requireUser(), rateLimitPerUser(60, 60000), async (req, res) => {
  try {
    const petitionId = req.params.id;
    await deletePetition({
      userSub: req.user.sub,
      petitionId
    });

    res.json({
      success: true,
      message: 'Petition deleted successfully.',
      petitionId
    });
  } catch (err) {
    console.error('[API DELETE /api/petitions/:id Error for sub %s]: %s', req.user?.sub, err.message);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * Step 7: Delete All Petitions for User (Right to Erasure, Owner only)
 */
router.delete('/api/petitions', requireUser(), rateLimitPerUser(60, 60000), async (req, res) => {
  try {
    const result = await deleteAllPetitionsForUser(req.user.sub);
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: 'All petitions for your account have been deleted.'
    });
  } catch (err) {
    console.error('[API DELETE /api/petitions Error for sub %s]: %s', req.user?.sub, err.message);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * Step 8: Query Petitions for Assigned School (School Admin only)
 * SchoolId is derived strictly from verified custom:school_id claim on server.
 * Returns only safe fields (date, authority, subject, evidenceSummary, status).
 * Omits letterText, userSub, and personal sender information.
 */
router.get('/api/petition/school', requireSchoolAdmin(), rateLimitPerUser(60, 60000), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        error: 'no_school_assigned',
        message: 'No school is assigned to this school admin account (missing custom:school_id).'
      });
    }

    const { limit, nextToken } = req.query;
    const { items, nextToken: newNextToken } = await listPetitionsBySchool(schoolId, {
      limit,
      nextToken
    });

    res.json({
      success: true,
      schoolId,
      count: items.length,
      petitions: items,
      nextToken: newNextToken
    });
  } catch (err) {
    console.error('[API GET /api/petition/school Error for sub %s]: %s', req.user?.sub, err.message);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

export default router;
