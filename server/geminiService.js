import fs from 'fs';
import path from 'path';
import 'dotenv/config';

/**
 * Token-Optimized Google Gemini Service
 * Implements:
 * 1. Zero-thinking budget (thinkingBudget: 0) to eliminate reasoning token overhead
 * 2. Living state snapshot writer (STATE_CONTEXT.md)
 * 3. In-memory deduplication cache to prevent redundant API calls
 */

const STATE_FILE_PATH = path.resolve(process.cwd(), 'STATE_CONTEXT.md');
const advisoryCache = new Map();

/**
 * Update the living Markdown state file on disk
 */
export function updateLivingStateSnapshot(data) {
  try {
    const md = `# DELHI AQI SPATIAL STATE SNAPSHOT
- Generated At: ${new Date().toISOString()}
- User Location: ${data.userLocation || 'Delhi (DTU / Bawana)'}
- User Estimated AQI: ${data.userAqi || 240} (Uncapped PM2.5: ${data.pm25 || 140} µg/m³)
- Nearest Monitoring Station: ${data.nearestStation || 'DTU'} (${data.nearestDistance || '1.8'} km)
- Dominant Pollutant: ${data.dominantPollutant || 'PM2.5'}
- Active Sources: Open-Meteo (Active), WAQI (${process.env.WAQI_API_KEY ? 'Active' : 'Standby'}), IQAir (${process.env.IQAIR_API_KEY ? 'Active' : 'Standby'})
`;
    fs.writeFileSync(STATE_FILE_PATH, md, 'utf-8');
  } catch (err) {
    console.warn('[geminiService] Could not write STATE_CONTEXT.md:', err.message);
  }
}

/**
 * Generate ultra-concise health advisory with zero wasted thinking tokens
 */
export async function generateGeminiAdvisory(metrics) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      advisory: 'Gemini API key is not configured in .env',
      tokenUsage: null,
    };
  }

  const { city, aqi, dominantPollutant = 'PM2.5', pm25 = 140 } = metrics;

  // Cache key: round AQI to nearest 10 to avoid redundant API calls for minor fluctuations
  const roundedAqi = Math.round(aqi / 10) * 10;
  const cacheKey = `${city}-${roundedAqi}`;

  if (advisoryCache.has(cacheKey)) {
    return {
      success: true,
      advisory: advisoryCache.get(cacheKey),
      cached: true,
      tokenUsage: { prompt: 0, candidates: 0, thoughts: 0, total: 0 },
    };
  }

  // Update living Markdown file
  updateLivingStateSnapshot({
    userLocation: city,
    userAqi: aqi,
    pm25,
    dominantPollutant,
  });

  // Read living state context directly to keep prompt ultra-compact (< 150 tokens)
  let contextSnippet = `Location: ${city} | AQI: ${aqi} | Primary: ${dominantPollutant}`;
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      contextSnippet = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    }
  } catch {
    // fallback to snippet
  }

  const prompt = `${contextSnippet}

Task: Give 2 concise health actions and 1 commute advisory for this air quality. Keep response under 60 words total.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          thinkingConfig: { thinkingBudget: 0 }, // ZERO wasted thinking tokens
          temperature: 0.2,
          maxOutputTokens: 180,
        },
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error(data.error?.message || 'No text candidate returned from Gemini');
    }

    const cleanText = text.trim();
    advisoryCache.set(cacheKey, cleanText);

    return {
      success: true,
      advisory: cleanText,
      cached: false,
      tokenUsage: {
        prompt: data.usageMetadata?.promptTokenCount || 0,
        candidates: data.usageMetadata?.candidatesTokenCount || 0,
        thoughts: data.usageMetadata?.thoughtsTokenCount || 0,
        total: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  } catch (err) {
    console.error('[geminiService] Call failed:', err.message);
    return {
      success: false,
      error: err.message,
      advisory: `AQI ${aqi} indicates elevated pollution levels. Wear an N95 mask outdoors and limit strenuous morning workouts.`,
      fallback: true,
    };
  }
}
