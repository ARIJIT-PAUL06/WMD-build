#!/usr/bin/env node

/**
 * Team Helper: Fetches the confidential client secret for wmd-iot-ingest-client
 * and stores it directly into .env without printing the secret to stdout/stderr.
 *
 * Usage:
 *   node scripts/fetch_ingest_secret.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand
} from '@aws-sdk/client-cognito-identity-provider';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

dotenv.config({ path: envPath });

const region = process.env.AWS_REGION || 'ap-south-1';
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_INGEST_CLIENT_ID;

if (!userPoolId || !clientId) {
  process.exit(1);
}

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

async function main() {
  try {
    const client = new CognitoIdentityProviderClient(clientConfig);
    const res = await client.send(new DescribeUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientId: clientId
    }));

    const clientSecret = res.UserPoolClient?.ClientSecret;
    if (!clientSecret) {
      process.exit(1);
    }

    // Write directly into .env
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const secretKey = 'COGNITO_INGEST_CLIENT_SECRET';
    const regex = new RegExp(`^${secretKey}=.*$`, 'm');

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${secretKey}=${clientSecret}`);
    } else {
      envContent = `${envContent.trim()}\n${secretKey}=${clientSecret}\n`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}

main();
