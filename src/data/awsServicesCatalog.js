/**
 * awsServicesCatalog.js
 * VayuVitals - AWS Cloud Architecture & Service Inventory
 *
 * Sourced directly from aws/template.yaml and repository implementation files.
 * Adheres strictly to the Zero-Faking Directive (AGENTS.md):
 * Every entry represents authentic infrastructure deployed or provisioned in code.
 * Excluded services (IoT Core, API Gateway, CloudFront) are NOT in use.
 */

export const CATEGORIES = [
  'compute',
  'data',
  'ml',
  'identity',
  'messaging',
  'ops',
];

export const CATEGORY_LABELS = {
  all: 'All Services',
  compute: 'Compute',
  data: 'Data & Storage',
  ml: 'ML & AI',
  identity: 'Identity',
  messaging: 'Messaging',
  ops: 'Ops & Infra',
};

export const AWS_SERVICES_CATALOG = [
  {
    id: 'lambda',
    name: 'AWS Lambda',
    category: 'compute',
    region: 'ap-south-1',
    purpose: 'Runs the Express backend API and scheduled atmospheric monitoring routines.',
    usedFor: [
      '`wmd-backend` Node.js 22 function running serverless-express API',
      'Autonomous monitor cron execution for real-time Delhi AQI ingestion',
      'Configured with 512 MB memory and 180 s execution timeout',
    ],
    config: 'Node.js 22 · 512 MB · 180s timeout',
    source: 'server/lambda.js',
  },
  {
    id: 'function-url',
    name: 'Lambda Function URL',
    category: 'compute',
    region: 'ap-south-1',
    purpose: 'Provides public HTTPS endpoints directly to the Lambda API without gateway overhead.',
    usedFor: [
      'Public HTTPS entry for API used by web and mobile via apiFetch',
      'Sub-millisecond routing overhead with built-in AWS TLS termination',
      'Configured with CORS headers for browser and native app requests',
    ],
    config: 'AuthType NONE · CORS enabled · HTTPS',
    source: 'src/utils/apiFetch.js',
  },
  {
    id: 'eventbridge',
    name: 'Amazon EventBridge',
    category: 'compute',
    region: 'ap-south-1',
    purpose: 'Schedules recurring atmospheric monitoring and autonomous health evaluation cycles.',
    usedFor: [
      '`rate(30 minutes)` rule that triggers the autonomous monitor',
      'Passes automated cron event payloads directly into Lambda entry point',
      'Autonomous state tracking without maintaining long-running servers',
    ],
    config: 'Scheduled Rule · rate(30 minutes) · WmdBackend target',
    source: 'aws/template.yaml',
  },
  {
    id: 'dynamodb',
    name: 'Amazon DynamoDB',
    category: 'data',
    region: 'ap-south-1',
    purpose: 'High-throughput NoSQL storage for station readings, buffer states, and petitions.',
    usedFor: [
      '`AirQualityReadings` table storing observations and monitor state',
      '`Petitions` table indexing community grievances by user and date',
      'On-demand billing with Point-in-Time Recovery (PITR) enabled',
    ],
    config: 'On-Demand billing · PITR enabled · 2 tables',
    source: 'server/awsServices.js',
  },
  {
    id: 's3',
    name: 'Amazon S3',
    category: 'data',
    region: 'ap-south-1',
    purpose: 'Object storage for historical air quality datasets and ML model artifacts.',
    usedFor: [
      'Stores training datasets combining CPCB and Open-Meteo observations',
      'Houses serialized XGBoost 1.7-1 model artifacts (model.tar.gz)',
      'Facilitates versioned model deployment to SageMaker endpoints',
    ],
    config: 'Standard storage · Encrypted at rest · Versioned artifacts',
    source: 'ml/launch_sagemaker_training_job.py',
  },
  {
    id: 'sagemaker',
    name: 'Amazon SageMaker',
    category: 'ml',
    region: 'ap-south-1',
    purpose: 'Trains and serves the 48-hour PM2.5 multi-horizon forecasting model.',
    usedFor: [
      'Trains XGBoost 1.7-1 regressor on 332,416 historical training pairs',
      'Serves 48h PM2.5 forecast from serverless endpoint in ap-south-1',
      'Serverless endpoint configured with 1024 MB and max 5 concurrency',
    ],
    config: 'Serverless · 1024 MB · max 5 concurrent',
    source: 'server/sagemakerService.js',
  },
  {
    id: 'bedrock',
    name: 'Amazon Bedrock',
    category: 'ml',
    region: 'ap-south-1',
    purpose: 'Generates contextual atmospheric health advisories and clinical recommendations.',
    usedFor: [
      'Generates contextual atmospheric health advisories for schools',
      'Invokes Claude 3 Haiku foundation model with low-latency responses',
      'Translates complex air quality metrics into actionable guidance',
    ],
    config: 'Claude 3 Haiku · Converse API · Zero retention',
    source: 'server/awsServices.js',
  },
  {
    id: 'cognito',
    name: 'Amazon Cognito',
    category: 'identity',
    region: 'ap-south-1',
    purpose: 'Secure citizen identity, school administrator authentication, and machine ingest tokens.',
    usedFor: [
      'User pool with citizen and school_admin role-based access groups',
      'PKCE authorization code flow for secure web and mobile sign-in',
      'Post-confirmation Lambda hook for initial profile provisioning',
    ],
    config: 'User Pool · PKCE clients · PostConfirmation trigger',
    source: 'server/authMiddleware.js',
  },
  {
    id: 'ses',
    name: 'Amazon SES',
    category: 'messaging',
    region: 'us-east-1',
    purpose: 'Delivers automated morning air alerts and emergency spike notices to registered schools.',
    usedFor: [
      'Morning and emergency advisory emails delivered to schools',
      'Auto-send toggle defaults to off unless explicitly enabled',
      'Verified sender identity operating in us-east-1 region',
    ],
    config: 'us-east-1 · Verified sender identity · TLS delivery',
    source: 'server/sesService.js',
  },
  {
    id: 'iam',
    name: 'AWS IAM',
    category: 'ops',
    region: 'global',
    purpose: 'Enforces least-privilege security roles across Lambda, Cognito, and SageMaker.',
    usedFor: [
      'Least-privilege roles for the backend Lambda and sign-up hook',
      'Scoped policies for DynamoDB, Bedrock, and SageMaker access',
      'Enforces strict service boundaries without wildcard admin rights',
    ],
    config: 'Least privilege · Role-based execution · Scoped policies',
    source: 'aws/template.yaml',
  },
  {
    id: 'cloudformation',
    name: 'AWS CloudFormation',
    category: 'ops',
    region: 'ap-south-1',
    purpose: 'Declarative Infrastructure as Code defining reproducible cloud stacks.',
    usedFor: [
      'Manages `wmd-stack` infrastructure defined in aws/template.yaml',
      'Deployments executed through reviewed CloudFormation change sets',
      'Ensures reproducible and version-controlled cloud infrastructure',
    ],
    config: 'Stack: wmd-stack · SAM template · Change sets',
    source: 'scripts/deploy_stack.mjs',
  },
  {
    id: 'cloudwatch',
    name: 'Amazon CloudWatch Logs',
    category: 'ops',
    region: 'ap-south-1',
    purpose: 'Centralized logging and diagnostic tracing for serverless Lambda execution.',
    usedFor: [
      'Captures diagnostic logs for `/aws/lambda/wmd-backend` function',
      'Logs queried by automated diagnostic scripts for system health',
      'Structured execution tracing for error analysis and monitoring',
    ],
    config: 'Log group: /aws/lambda/wmd-backend · Diagnostic query',
    source: 'scripts/query_cw_logs.py',
  },
];

export const ARCHITECTURE_LANES = [
  {
    id: 'request-flow',
    title: 'Client Request & Inference Pipeline',
    subtitle: 'Synchronous API & Model Ingestion',
    steps: [
      {
        step: 1,
        title: 'Client Request',
        service: 'Web & Mobile App',
        detail: 'HTTPS request signed with Cognito JWT or anonymous read',
      },
      {
        step: 2,
        title: 'HTTPS Ingress',
        service: 'Lambda Function URL',
        detail: 'Sub-millisecond TLS termination & origin CORS handling',
      },
      {
        step: 3,
        title: 'API Orchestrator',
        service: 'AWS Lambda (wmd-backend)',
        detail: 'Node.js 22 runtime parses routes via serverless-express',
      },
      {
        step: 4,
        title: 'Inference & Storage',
        service: 'DynamoDB / SageMaker / Bedrock',
        detail: 'Dynamic routing to XGBoost endpoint, DynamoDB tables, or Claude 3',
      },
    ],
  },
  {
    id: 'monitor-flow',
    title: 'Scheduled Atmospheric Monitor Routine',
    subtitle: 'Autonomous Sensor & Dispatch Pipeline',
    steps: [
      {
        step: 1,
        title: 'Temporal Trigger',
        service: 'Amazon EventBridge',
        detail: 'rate(30 minutes) cloud rule fires scheduled monitor event',
      },
      {
        step: 2,
        title: 'Monitor Handler',
        service: 'AWS Lambda (wmd-backend)',
        detail: 'Fetches Delhi CAAQMS station telemetry & weather advection',
      },
      {
        step: 3,
        title: 'Model Forecast',
        service: 'Amazon SageMaker',
        detail: 'Computes 48-hour forward PM2.5 trajectory via XGBoost',
      },
      {
        step: 4,
        title: 'Archive & Alert',
        service: 'DynamoDB & Amazon SES',
        detail: 'Writes telemetry archive and dispatches school advisory emails',
      },
    ],
  },
];
