import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { initializeSchema } from './db/schema';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import signatureRoutes from './routes/signatures';
import alertRoutes from './routes/alerts';
import distributionRoutes from './routes/distribution';
import citadelRoutes from './routes/citadel';
import { getDocumentSignatures } from './services/signatureService';
import { authenticate } from './middleware/auth';
import { AuthenticatedRequest } from './middleware/auth';
import { Response } from 'express';

const app = express();

// Initialize the database independently of frontend delivery. A temporary database
// outage must not prevent the static application shell from loading.
let schemaInitializationError: Error | undefined;
const schemaReady: Promise<void> = initializeSchema().catch((err: unknown) => {
  schemaInitializationError = err instanceof Error ? err : new Error(String(err));
  console.error('[NyxScribe] Schema initialization failed:', schemaInitializationError);
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve the frontend before any database-dependent middleware. The GitHub Pages
// homepage setting emits /Scribe/static/... URLs, so retain that base path on Vercel.
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
if (!fs.existsSync(frontendBuildPath)) {
  console.warn(`[NyxScribe] Frontend build directory not found at ${frontendBuildPath}. Run 'npm run frontend:build' to generate it.`);
}
const serveFrontend = express.static(frontendBuildPath);
app.use(serveFrontend);
app.use('/Scribe', serveFrontend);

// Only API requests require the database schema. Keep the API unavailable rather
// than crashing the function when the database connection is temporarily down.
app.use('/api', async (_req, res, next) => {
  await schemaReady;
  if (schemaInitializationError) {
    res.status(503).json({ success: false, error: 'Database is temporarily unavailable. Please try again shortly.' });
    return;
  }
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Upload rate limit exceeded, please try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/documents/:id/versions', uploadLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/distribution', distributionRoutes);
app.use('/api/citadel', citadelRoutes);

// Document signatures shortcut route
app.get('/api/documents/:id/signatures', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sigs = await getDocumentSignatures(req.params.id);
    res.json({ success: true, data: sigs });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'NyxScribe' } });
});

// Serve frontend for non-API routes (client-side routing); return 404 for unknown API routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ success: false, error: 'Route not found' });
  } else {
    res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
      if (err) {
        res.status(503).json({ success: false, error: 'Frontend is not available. Please build the frontend first.' });
      }
    });
  }
});

export default app;
