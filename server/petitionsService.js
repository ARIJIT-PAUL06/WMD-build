import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  aggregateSchoolEvidence,
  getSchoolsDirectory,
  getSpatialGrids,
  getKnownStations
} from './evidenceService.js';

dotenv.config();

let ddbDocClient = null;
let isDdbInitialized = false;

export const VALID_PETITION_STATUSES = [
  'DRAFT_SAVED',
  'OPENED_IN_MAIL',
  'SHARED',
  'MARKED_AS_SENT'
];

export function getPetitionsTableName() {
  return process.env.PETITIONS_TABLE_NAME || 'Petitions';
}

/**
 * Allow test suites to inject a mocked DynamoDB Document Client when in test environment.
 */
export function setTestDocClient(client) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('setTestDocClient is strictly prohibited outside NODE_ENV=test.');
  }
  ddbDocClient = client;
  isDdbInitialized = true;
}

export function resetTestDocClient() {
  if (process.env.NODE_ENV === 'test') {
    ddbDocClient = null;
    isDdbInitialized = false;
  }
}

export async function getDynamoDocClient() {
  if (isDdbInitialized && ddbDocClient) {
    return ddbDocClient;
  }

  const region = process.env.AWS_REGION || 'ap-south-1';
  const accessKey = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  // In local development without credentials or mock client, return null for 503
  if (!accessKey && !secretKey && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return null;
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');

    const clientConfig = { region };
    if (accessKey && secretKey) {
      const sessionToken = accessKey.startsWith('ASIA') ? process.env.AWS_SESSION_TOKEN : undefined;
      clientConfig.credentials = {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
        ...(sessionToken ? { sessionToken } : {})
      };
    }

    const ddbClient = new DynamoDBClient(clientConfig);
    ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true }
    });
    isDdbInitialized = true;
    return ddbDocClient;
  } catch (err) {
    console.error('[PetitionsService] Error initializing DynamoDB client:', err.message);
    return null;
  }
}

/**
 * Validate size limits on petition payloads.
 * Throws an error with statusCode 413 if any limit is exceeded.
 */
export function validatePayloadSize(petitionData) {
  if (!petitionData) return;

  if (petitionData.letterSubject && typeof petitionData.letterSubject === 'string') {
    if (petitionData.letterSubject.length > 300) {
      const err = new Error('letterSubject exceeds maximum allowed length of 300 characters.');
      err.statusCode = 413;
      throw err;
    }
  }

  if (petitionData.letterText && typeof petitionData.letterText === 'string') {
    if (petitionData.letterText.length > 20000) {
      const err = new Error('letterText exceeds maximum allowed length of 20,000 characters.');
      err.statusCode = 413;
      throw err;
    }
  }

  if (Array.isArray(petitionData.demands)) {
    if (petitionData.demands.length > 20) {
      const err = new Error('demands array exceeds maximum limit of 20 demands.');
      err.statusCode = 413;
      throw err;
    }
    for (const d of petitionData.demands) {
      if (typeof d === 'string' && d.length > 300) {
        const err = new Error('Each demand must not exceed 300 characters.');
        err.statusCode = 413;
        throw err;
      }
    }
  }
}

/**
 * Creates and persists a petition filed by an authenticated citizen.
 * Computes evidence server-side, validates targets against directories,
 * enforces honest statuses and payload size limits, and supports idempotent clientRequestId.
 *
 * @param {Object} params
 * @param {string} params.userSub - Verified subject ID of the authenticated citizen
 * @param {Object} params.petitionData - Petition payload
 * @param {string} [params.clientRequestId] - Idempotency request ID
 */
export async function createPetition({ userSub, petitionData = {}, clientRequestId = null }) {
  if (!userSub) {
    const err = new Error('userSub is required to file a petition.');
    err.statusCode = 401;
    throw err;
  }

  // 1. Old nested format check (fail loudly)
  if (petitionData.target !== undefined || petitionData.letterBody !== undefined) {
    const err = new Error('Use the flat format: targetType, schoolId|stationName|gridId, letterText');
    err.statusCode = 400;
    throw err;
  }

  // 2. Enforce payload size limits (413)
  validatePayloadSize(petitionData);

  // 3. Validate targetType (Required: 'school', 'station', or 'grid')
  const rawTargetType = petitionData.targetType;
  if (!rawTargetType || typeof rawTargetType !== 'string') {
    const err = new Error('targetType is required and must be "school", "station", or "grid".');
    err.statusCode = 400;
    throw err;
  }

  const targetType = rawTargetType.trim().toLowerCase();
  if (!['school', 'station', 'grid'].includes(targetType)) {
    const err = new Error(`Invalid targetType "${rawTargetType}". Allowed types are: school, station, grid.`);
    err.statusCode = 400;
    throw err;
  }

  // 4. Validate Status (Honest statuses only, default: DRAFT_SAVED)
  let status = petitionData.status ? petitionData.status.trim().toUpperCase() : 'DRAFT_SAVED';
  if (!VALID_PETITION_STATUSES.includes(status)) {
    const err = new Error(`Invalid status "${petitionData.status}". Allowed statuses: ${VALID_PETITION_STATUSES.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }

  // 5. Resolve and validate target details against authoritative directories
  let authoritativeSchoolId = null;
  let authoritativeTargetName = '';
  let authoritativeLocality = '';
  let authoritativeDistrict = '';
  let serverEvidence = null;

  if (targetType === 'school') {
    const sId = (petitionData.schoolId || '').trim();
    if (!sId) {
      const err = new Error('schoolId is required when targetType is "school".');
      err.statusCode = 400;
      throw err;
    }

    const schools = getSchoolsDirectory();
    const matched = schools.find(s => s.id === sId || (s.id && s.id.toLowerCase() === sId.toLowerCase()));
    if (!matched) {
      const err = new Error(`Unknown schoolId: "${sId}". School not found in institutional directory.`);
      err.statusCode = 400;
      throw err;
    }

    authoritativeSchoolId = matched.id;
    authoritativeTargetName = matched.name;
    authoritativeLocality = matched.locality || '';
    authoritativeDistrict = matched.district || '';

    // Compute evidence on the server
    serverEvidence = aggregateSchoolEvidence({
      schoolName: authoritativeTargetName,
      locality: authoritativeLocality,
      days: 14
    });
  } else if (targetType === 'station') {
    const stName = (petitionData.stationName || petitionData.targetName || '').trim();
    if (!stName) {
      const err = new Error('stationName is required when targetType is "station".');
      err.statusCode = 400;
      throw err;
    }

    const knownStations = getKnownStations();
    const stLower = stName.toLowerCase();
    let isKnown = false;
    for (const s of knownStations) {
      if (s.toLowerCase().includes(stLower) || stLower.includes(s.toLowerCase())) {
        isKnown = true;
        break;
      }
    }

    if (!isKnown) {
      const err = new Error(`Unknown stationName: "${stName}". Station not found in monitored stations.`);
      err.statusCode = 400;
      throw err;
    }

    authoritativeTargetName = stName;
    authoritativeLocality = petitionData.locality || '';
    // Station petitions MUST NOT set schoolId so they never appear in the school admin GSI
    authoritativeSchoolId = null;

    serverEvidence = aggregateSchoolEvidence({
      stationName: authoritativeTargetName,
      days: 14
    });
  } else if (targetType === 'grid') {
    const gId = (petitionData.gridId || petitionData.targetName || '').trim();
    if (!gId) {
      const err = new Error('gridId is required when targetType is "grid".');
      err.statusCode = 400;
      throw err;
    }

    const spatialGrids = getSpatialGrids();
    if (!spatialGrids[gId]) {
      const err = new Error(`Unknown gridId: "${gId}". Spatial grid cell not found.`);
      err.statusCode = 400;
      throw err;
    }

    authoritativeTargetName = gId;
    authoritativeLocality = petitionData.locality || '';
    // Grid petitions MUST NOT set schoolId so they never appear in the school admin GSI
    authoritativeSchoolId = null;

    serverEvidence = aggregateSchoolEvidence({
      gridId: authoritativeTargetName,
      days: 14
    });
  }

  // 6. Validate Required Fields: letterSubject, letterText, authorityName
  const letterSubject = (petitionData.letterSubject || '').trim();
  if (!letterSubject) {
    const err = new Error('letterSubject is required.');
    err.statusCode = 400;
    throw err;
  }

  const letterText = (petitionData.letterText || '').trim();
  if (!letterText) {
    const err = new Error('letterText is required.');
    err.statusCode = 400;
    throw err;
  }

  const authorityName = (petitionData.authorityName || '').trim();
  if (!authorityName) {
    const err = new Error('authorityName is required.');
    err.statusCode = 400;
    throw err;
  }

  // 7. Validate Idempotent clientRequestId (8-64 chars, [A-Za-z0-9-])
  const effectiveRequestId = clientRequestId || petitionData.clientRequestId;
  if (!effectiveRequestId || typeof effectiveRequestId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(effectiveRequestId)) {
    const err = new Error('clientRequestId is required and must match /^[A-Za-z0-9-]{8,64}$/.');
    err.statusCode = 400;
    throw err;
  }

  // 8. Connect to DynamoDB
  const docClient = await getDynamoDocClient();
  if (!docClient) {
    const err = new Error('AWS DynamoDB credentials not configured on server.');
    err.statusCode = 503;
    throw err;
  }

  const tableName = getPetitionsTableName();

  // 9. Prepare safe evidence summary for storage and GSI projection
  const evidenceSummary = {
    avgMorningPm25: serverEvidence?.avgMorningPm25 ?? null,
    peakPm25: serverEvidence?.peakPm25 ?? null,
    peakDate: serverEvidence?.peakDate || serverEvidence?.endDate || '',
    schoolDaysTotal: serverEvidence?.schoolDaysTotal ?? 0,
    exceedanceCount: serverEvidence?.exceedanceCount ?? 0,
    daysWithData: serverEvidence?.daysWithData ?? 0,
    daysMissing: serverEvidence?.daysMissing ?? 0,
    threshold: serverEvidence?.threshold ?? 60,
    timeHorizonDays: serverEvidence?.timeHorizonDays ?? 14
  };

  // Derive immutable petitionId strictly from clientRequestId and userSub
  const petitionId = 'pet_' + crypto.createHash('sha256').update(`${userSub}:${effectiveRequestId}`).digest('hex').slice(0, 32);
  const nowIso = new Date().toISOString();
  const language = (petitionData.language || 'en').trim().toLowerCase();
  const tone = (petitionData.tone || 'formal').trim();

  // 10. Build persistent record
  // Only include schoolId when targetType === 'school' to maintain sparse index integrity
  const record = {
    userSub,
    petitionId,
    clientRequestId: effectiveRequestId,
    targetType,
    targetName: authoritativeTargetName,
    ...(authoritativeSchoolId ? { schoolId: authoritativeSchoolId } : {}),
    ...(targetType === 'school' ? { schoolName: authoritativeTargetName } : {}),
    ...(targetType === 'station' ? { stationName: authoritativeTargetName } : {}),
    district: authoritativeDistrict,
    locality: authoritativeLocality,
    authorityName,
    authorityRole: petitionData.authorityRole || '',
    authorityEmail: petitionData.authorityEmail || '',
    authorityNodalAgency: petitionData.authorityNodalAgency || '',
    senderName: petitionData.senderName || '',
    senderRole: petitionData.senderRole || '',
    senderContact: petitionData.senderContact || '',
    letterSubject,
    letterText,
    demands: Array.isArray(petitionData.demands) ? petitionData.demands : [],
    language,
    tone,
    evidenceSummary,
    evidenceMetrics: serverEvidence || {},
    status,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const { PutCommand, GetCommand } = await import('@aws-sdk/lib-dynamodb');
  try {
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: record,
      ConditionExpression: 'attribute_not_exists(petitionId)'
    }));
    return record;
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      const existingResult = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { userSub, petitionId }
      }));
      return {
        ...(existingResult.Item || record),
        isDuplicate: true
      };
    }
    throw err;
  }
}

/**
 * Retrieves a single petition by petitionId for the authenticated owner.
 */
export async function getPetitionById({ userSub, petitionId }) {
  if (!userSub || !petitionId) return null;

  const docClient = await getDynamoDocClient();
  if (!docClient) {
    const err = new Error('AWS DynamoDB credentials not configured on server.');
    err.statusCode = 503;
    throw err;
  }

  const tableName = getPetitionsTableName();
  const { GetCommand } = await import('@aws-sdk/lib-dynamodb');

  const result = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: { userSub, petitionId }
  }));

  return result.Item || null;
}

/**
 * Updates the honest status of an existing petition (Owner only).
 */
export async function updatePetitionStatus({ userSub, petitionId, status }) {
  if (!userSub || !petitionId) {
    const err = new Error('userSub and petitionId are required to update status.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedStatus = (status || '').trim().toUpperCase();
  if (!VALID_PETITION_STATUSES.includes(normalizedStatus)) {
    const err = new Error(`Invalid status "${status}". Allowed statuses: ${VALID_PETITION_STATUSES.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }

  const docClient = await getDynamoDocClient();
  if (!docClient) {
    const err = new Error('AWS DynamoDB credentials not configured on server.');
    err.statusCode = 503;
    throw err;
  }

  const tableName = getPetitionsTableName();
  const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');

  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { userSub, petitionId },
      UpdateExpression: 'SET #st = :status, #ua = :updatedAt',
      ConditionExpression: 'attribute_exists(petitionId)',
      ExpressionAttributeNames: {
        '#st': 'status',
        '#ua': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': normalizedStatus,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    return result.Attributes;
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      const notFound = new Error('Petition not found or unauthorized.');
      notFound.statusCode = 404;
      throw notFound;
    }
    throw err;
  }
}

/**
 * Deletes a single petition (Owner only).
 */
export async function deletePetition({ userSub, petitionId }) {
  if (!userSub || !petitionId) {
    const err = new Error('userSub and petitionId are required to delete petition.');
    err.statusCode = 400;
    throw err;
  }

  const docClient = await getDynamoDocClient();
  if (!docClient) {
    const err = new Error('AWS DynamoDB credentials not configured on server.');
    err.statusCode = 503;
    throw err;
  }

  const tableName = getPetitionsTableName();
  const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');

  try {
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: { userSub, petitionId },
      ConditionExpression: 'attribute_exists(petitionId)'
    }));
    return { success: true, petitionId };
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      const notFound = new Error('Petition not found or unauthorized.');
      notFound.statusCode = 404;
      throw notFound;
    }
    throw err;
  }
}

/**
 * Right to erasure: deletes all petitions created by a specific user.
 */
export async function deleteAllPetitionsForUser(userSub) {
  if (!userSub) {
    const err = new Error('userSub is required to delete all petitions.');
    err.statusCode = 400;
    throw err;
  }

  const docClient = await getDynamoDocClient();
  if (!docClient) {
    const err = new Error('AWS DynamoDB credentials not configured on server.');
    err.statusCode = 503;
    throw err;
  }

  const tableName = getPetitionsTableName();
  const { QueryCommand, DeleteCommand } = await import('@aws-sdk/lib-dynamodb');

  let exclusiveStartKey = undefined;
  let deletedCount = 0;

  do {
    const queryRes = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'userSub = :sub',
      ExpressionAttributeValues: { ':sub': userSub },
      ProjectionExpression: 'petitionId',
      ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {})
    }));

    const items = queryRes.Items || [];
    for (const item of items) {
      await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { userSub, petitionId: item.petitionId }
      }));
      deletedCount++;
    }

    exclusiveStartKey = queryRes.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return { success: true, deletedCount };
}

/**
 * Lists all petitions created by a specific user, with pagination support.
 *
 * @param {string} userSub - Verified subject ID
 * @param {Object} [options]
 * @param {number} [options.limit=20]
 * @param {string} [options.nextToken=null] - Base64 encoded exclusive start key
 */
export async function listPetitionsByUser(userSub, { limit = 20, nextToken = null } = {}) {
  if (!userSub) {
    throw new Error('userSub is required to list petitions.');
  }

  const docClient = await getDynamoDocClient();
  if (!docClient) {
    const err = new Error('AWS DynamoDB credentials not configured on server.');
    err.statusCode = 503;
    throw err;
  }

  const tableName = getPetitionsTableName();
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  let exclusiveStartKey = undefined;
  if (nextToken) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf8'));
    } catch (e) {
      const badReq = new Error('Invalid pagination nextToken.');
      badReq.statusCode = 400;
      throw badReq;
    }
  }

  const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
  const result = await docClient.send(new QueryCommand({
    TableName: tableName,
    IndexName: 'userSub-createdAt-index',
    KeyConditionExpression: 'userSub = :sub',
    ExpressionAttributeValues: {
      ':sub': userSub
    },
    ScanIndexForward: false, // Newest first
    Limit: parsedLimit,
    ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {})
  }));

  const items = result.Items || [];
  const newNextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : null;

  return {
    items,
    nextToken: newNextToken
  };
}

/**
 * Queries petitions for a specific school (used by school_admin role).
 * Queries the GSI schoolId-createdAt-index.
 * Defense-in-depth: enforces that ONLY safe non-PII fields are returned.
 *
 * @param {string} schoolId - Validated school identifier
 * @param {Object} [options]
 * @param {number} [options.limit=20]
 * @param {string} [options.nextToken=null]
 */
export async function listPetitionsBySchool(schoolId, { limit = 20, nextToken = null } = {}) {
  if (!schoolId) {
    throw new Error('schoolId is required to list school petitions.');
  }

  const docClient = await getDynamoDocClient();
  if (!docClient) {
    const err = new Error('AWS DynamoDB credentials not configured on server.');
    err.statusCode = 503;
    throw err;
  }

  const tableName = getPetitionsTableName();
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  let exclusiveStartKey = undefined;
  if (nextToken) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf8'));
    } catch (e) {
      const badReq = new Error('Invalid pagination nextToken.');
      badReq.statusCode = 400;
      throw badReq;
    }
  }

  const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
  const result = await docClient.send(new QueryCommand({
    TableName: tableName,
    IndexName: 'schoolId-createdAt-index',
    KeyConditionExpression: 'schoolId = :sId',
    ExpressionAttributeValues: {
      ':sId': schoolId
    },
    ScanIndexForward: false,
    Limit: parsedLimit,
    ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {})
  }));

  const rawItems = result.Items || [];

  // Defense-in-depth: strictly project safe fields only
  const safeItems = rawItems.map(item => ({
    petitionId: item.petitionId,
    createdAt: item.createdAt,
    authorityName: item.authorityName || '',
    letterSubject: item.letterSubject || '',
    status: item.status || 'DRAFT_SAVED',
    evidenceSummary: item.evidenceSummary || {}
  }));

  const newNextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : null;

  return {
    items: safeItems,
    nextToken: newNextToken
  };
}
