#!/usr/bin/env node

/**
 * CloudFormation Stack Deployment Script for VayuVitals (wmd-stack)
 *
 * Reads configuration and secrets from .env so that sensitive parameters
 * (GEMINI_API_KEY, ADMIN_API_KEY) never leak into shell history or process tables.
 *
 * Usage:
 *   node scripts/deploy_stack.mjs --review   (creates ChangeSet and prints change list for review)
 *   node scripts/deploy_stack.mjs --execute  (executes reviewed ChangeSet and prints stack outputs)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync, execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env') });

const region = process.env.AWS_REGION || 'ap-south-1';
const stackName = process.env.CFN_STACK_NAME || 'wmd-stack';
const changeSetName = 'update-wmd-stack';

const args = process.argv.slice(2);
const isReview = args.includes('--review');
const isExecute = args.includes('--execute');

if (!isReview && !isExecute) {
  console.log(`
Usage:
  node scripts/deploy_stack.mjs --review
  node scripts/deploy_stack.mjs --execute

Step 1: Run with --review to package the template, create a ChangeSet, and view proposed changes.
Step 2: Inspect the changes. If no resources are unexpectedly deleted or replaced, run with --execute.
`);
  process.exit(0);
}

const templatePath = path.join(projectRoot, 'aws', 'template.yaml');
const packagedTemplatePath = path.join(projectRoot, 'aws', 'packaged.yaml');

// Gather parameters securely from environment
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const adminApiKey = process.env.ADMIN_API_KEY || '';
const useSesEmail = (process.env.USE_SES_EMAIL === 'true') ? 'true' : 'false';
const sesSenderEmail = process.env.SES_SENDER_EMAIL || process.env.AWS_SES_VERIFIED_SENDER || 'vayuvitals@gmail.com';
const mobileDevCallbackUrl = process.env.MOBILE_DEV_CALLBACK_URL || 'exp://127.0.0.1:8081/--/auth/callback';

if (isReview) {
  console.log(`\n================================================================`);
  console.log(`0. Building Lambda bundle via scripts/build_lambda.mjs`);
  console.log(`================================================================`);
  const buildRes = spawnSync('node', ['scripts/build_lambda.mjs'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });
  if (buildRes.status !== 0) {
    console.error('❌ Failed building Lambda bundle. Aborting review.');
    process.exit(1);
  }

  console.log(`\n================================================================`);
  console.log(`1. Packaging CloudFormation template for stack: ${stackName}`);
  console.log(`   Region: ${region}`);
  console.log(`================================================================`);

  // Detect artifact bucket
  let artifactBucket = process.env.CFN_ARTIFACT_BUCKET;
  if (!artifactBucket) {
    try {
      const identityOut = execSync(`aws sts get-caller-identity --query Account --output text --region ${region}`, { encoding: 'utf8' }).trim();
      artifactBucket = `wmd-cfn-artifacts-${identityOut}-${region}`;
    } catch (e) {
      console.error('❌ Failed resolving AWS caller identity. Please configure AWS CLI credentials.');
      process.exit(1);
    }
  }

  console.log(`📦 Packaging artifacts to S3 bucket: ${artifactBucket}...`);
  const pkgRes = spawnSync(
    'aws',
    [
      'cloudformation', 'package',
      '--template-file', templatePath,
      '--s3-bucket', artifactBucket,
      '--output-template-file', packagedTemplatePath,
      '--region', region
    ],
    { stdio: 'inherit', shell: true }
  );

  if (pkgRes.status !== 0) {
    console.error('❌ Failed packaging CloudFormation template.');
    process.exit(1);
  }

  console.log(`\n2. Creating ChangeSet "${changeSetName}" for review...`);
  const paramArgs = [
    `ParameterKey=GeminiApiKey,ParameterValue=${geminiApiKey}`,
    `ParameterKey=AdminApiKey,ParameterValue=${adminApiKey}`,
    `ParameterKey=UseSesEmail,ParameterValue=${useSesEmail}`,
    `ParameterKey=SesSenderEmail,ParameterValue=${sesSenderEmail}`,
    `ParameterKey=MobileDevCallbackUrl,ParameterValue=${mobileDevCallbackUrl}`
  ];

  const csRes = spawnSync(
    'aws',
    [
      'cloudformation', 'create-change-set',
      '--stack-name', stackName,
      '--change-set-name', changeSetName,
      '--template-body', `file://${packagedTemplatePath}`,
      '--capabilities', 'CAPABILITY_NAMED_IAM',
      '--parameters', ...paramArgs,
      '--region', region
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: true }
  );

  if (csRes.status !== 0) {
    console.error('❌ Error creating ChangeSet:');
    console.error(csRes.stderr?.toString());
    process.exit(1);
  }

  console.log(`⏳ Waiting for ChangeSet creation to complete...`);
  execSync(
    `aws cloudformation wait change-set-create-complete --stack-name ${stackName} --change-set-name ${changeSetName} --region ${region}`,
    { stdio: 'inherit' }
  );

  console.log(`\n📋 Describing proposed changes in ChangeSet "${changeSetName}":\n`);
  const descOut = execSync(
    `aws cloudformation describe-change-set --stack-name ${stackName} --change-set-name ${changeSetName} --query "Changes[*].ResourceChange.{Action:Action,LogicalId:LogicalResourceId,Type:ResourceType,Replacement:Replacement}" --output table --region ${region}`,
    { encoding: 'utf8' }
  );
  console.log(descOut);

  console.log(`\n⚠️  REVIEW INSTRUCTIONS:`);
  console.log(`1. Inspect the table above.`);
  console.log(`2. Verify that AirQualityDynamoDBTable and WmdBackendFunction are NOT marked for Remove or Replace.`);
  console.log(`3. Once verified, execute the stack update by running:`);
  console.log(`   node scripts/deploy_stack.mjs --execute\n`);
}

if (isExecute) {
  console.log(`\n================================================================`);
  console.log(`Executing ChangeSet "${changeSetName}" on stack: ${stackName}`);
  console.log(`================================================================\n`);

  const execRes = spawnSync(
    'aws',
    [
      'cloudformation', 'execute-change-set',
      '--stack-name', stackName,
      '--change-set-name', changeSetName,
      '--region', region
    ],
    { stdio: 'inherit', shell: true }
  );

  if (execRes.status !== 0) {
    console.error('❌ Failed executing ChangeSet.');
    process.exit(1);
  }

  console.log(`⏳ Waiting for stack update to complete (this may take 2-4 minutes)...`);
  execSync(
    `aws cloudformation wait stack-update-complete --stack-name ${stackName} --region ${region}`,
    { stdio: 'inherit' }
  );

  console.log(`\n🎉 Stack update completed successfully!`);
  console.log(`\nStack Outputs:\n`);
  const outputs = execSync(
    `aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs" --output table --region ${region}`,
    { encoding: 'utf8' }
  );
  console.log(outputs);
}
