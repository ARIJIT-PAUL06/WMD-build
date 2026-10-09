#!/usr/bin/env node

/**
 * Team CLI Script: Promote a verified user to school_admin and bind custom:school_id
 *
 * Usage:
 *   node scripts/cognito_promote_school_admin.js <email> <schoolId>
 *
 * Example:
 *   node scripts/cognito_promote_school_admin.js principal@dpsrohini.in SCH_DEL_0001
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env') });

const [,, emailArg, schoolIdArg] = process.argv;

if (!emailArg || !schoolIdArg) {
  console.error('\n❌ Usage: node scripts/cognito_promote_school_admin.js <email> <schoolId>');
  console.error('Example: node scripts/cognito_promote_school_admin.js admin@school.edu SCH_DEL_0001\n');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const schoolId = schoolIdArg.trim();

// 1. Validate schoolId against schoolsDirectory.json
const directoryPathCandidates = [
  path.join(projectRoot, 'server', 'data', 'schoolsDirectory.json'),
  path.join(projectRoot, 'src', 'data', 'schoolsDirectory.json')
];

let matchedSchool = null;
for (const p of directoryPathCandidates) {
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      const list = data.educationalInstitutions || [];
      matchedSchool = list.find(s => s.id === schoolId || (s.id && s.id.toLowerCase() === schoolId.toLowerCase()));
      if (matchedSchool) break;
    } catch (e) {
      // Continue to next candidate
    }
  }
}

if (!matchedSchool) {
  console.error(`\n❌ Error: schoolId "${schoolId}" was not found in schoolsDirectory.json.`);
  console.error('Please verify the exact school ID from the directory before promoting an administrator.\n');
  process.exit(1);
}

console.log(`\n🏫 Validated School: "${matchedSchool.name}" (${matchedSchool.locality || matchedSchool.district || 'Delhi'})`);

// 2. Initialize Cognito Client
const userPoolId = process.env.COGNITO_USER_POOL_ID;
if (!userPoolId) {
  console.error('\n❌ Error: COGNITO_USER_POOL_ID is not configured in .env.');
  process.exit(1);
}

const region = process.env.AWS_REGION || 'ap-south-1';
const accessKey = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const sessionToken = accessKey?.startsWith('ASIA') ? process.env.AWS_SESSION_TOKEN : undefined;

const clientConfig = { region };
if (accessKey && secretKey) {
  clientConfig.credentials = {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    ...(sessionToken ? { sessionToken } : {})
  };
}

const client = new CognitoIdentityProviderClient(clientConfig);

async function promote() {
  console.log(`\n🔍 Verifying user existence in User Pool "${userPoolId}"...`);

  // Verify user exists
  try {
    const userRes = await client.send(new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: email
    }));
    console.log(`   User found! Status: ${userRes.UserStatus}, Enabled: ${userRes.Enabled}`);
  } catch (err) {
    console.error(`\n❌ User lookup failed for "${email}":`, err.message);
    process.exit(1);
  }

  // 3. Set custom:school_id attribute
  console.log(`📝 Setting custom:school_id = "${matchedSchool.id}"...`);
  try {
    await client.send(new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        {
          Name: 'custom:school_id',
          Value: matchedSchool.id
        }
      ]
    }));
    console.log('   Attribute updated successfully.');
  } catch (err) {
    console.error('❌ Failed updating custom:school_id attribute:', err.message);
    process.exit(1);
  }

  // 4. Add user to school_admin group
  console.log(`👥 Adding user to group "school_admin"...`);
  try {
    await client.send(new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: email,
      GroupName: 'school_admin'
    }));
    console.log('   User added to school_admin group successfully.');
  } catch (err) {
    console.error('❌ Failed adding user to school_admin group:', err.message);
    process.exit(1);
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 SUCCESS: User ${email} promoted to school_admin!`);
  console.log(`   School ID: ${matchedSchool.id}`);
  console.log(`   School Name: ${matchedSchool.name}`);
  console.log(`   The user will now have access to /api/petition/school for this institution.`);
  console.log(`=======================================================\n`);
}

promote().catch(err => {
  console.error('\n❌ Unexpected promotion error:', err);
  process.exit(1);
});
