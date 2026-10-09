import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { generalApiLimiter } from './middleware/authAndRateLimit.js';
import healthRoutes from './routes/healthRoutes.js';
import heatmapRoutes from './routes/heatmapRoutes.js';
import airQualityRoutes from './routes/airQualityRoutes.js';
import petitionRoutes, {
  verifyNumbersPreserved,
  verifyPlaceholdersPreserved,
  SENDER_PLACEHOLDERS
} from './routes/petitionRoutes.js';
import advisoryRoutes from './routes/advisoryRoutes.js';
import sagemakerRoutes from './routes/sagemakerRoutes.js';
import monitorRoutes from './routes/monitorRoutes.js';
import { startAutonomousDaemon } from './autonomousAtmosphericMonitor.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy (API Gateway, CloudFront, Vercel)
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://localhost:19006',
  'https://wmd-civic.in',
  'https://vayuvitals.in'
];
if (process.env.VERCEL_URL) {
  const vercelOrigin = process.env.VERCEL_URL.startsWith('http')
    ? process.env.VERCEL_URL
    : `https://${process.env.VERCEL_URL}`;
  allowedOrigins.push(vercelOrigin);
}
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Non-browser callers (mobile app via Expo/fetch) send no origin
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json());
app.use('/api/', generalApiLimiter);

// Logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Domain API Routers
app.use('/', healthRoutes);
app.use('/', heatmapRoutes);
app.use('/', airQualityRoutes);
app.use('/', petitionRoutes);
app.use('/', advisoryRoutes);
app.use('/', sagemakerRoutes);
app.use('/', monitorRoutes);

// Catch-all 404 handler (prevents unhandled serverless-express on-finished error)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🌿 AWS Environmental Hacks API Server running on port ${PORT}`);
    console.log(`📡 Modular Routers Loaded: Health, Heatmap, AQI, Petition, Advisory, SageMaker, Monitor`);
    console.log(`=======================================================`);

    // Start background atmospheric monitoring daemon only if explicitly enabled locally
    if (process.env.ENABLE_LOCAL_DAEMON === 'true') {
      startAutonomousDaemon(30);
    } else {
      console.log('☁️  Local background daemon idle — AWS EventBridge handles scheduled monitoring in the cloud.');
    }
  });
}

// Re-export petition guards for backward-compatibility with tests & consumers
export {
  verifyNumbersPreserved,
  verifyPlaceholdersPreserved,
  SENDER_PLACEHOLDERS
};

export default app;
