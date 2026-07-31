import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { initializeSchema } from './db/schema';
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

// Begin schema initialization immediately; requests wait for it via middleware below
const schemaReady: Promise<void> = initializeSchema().catch((err) => {
  console.error('[NyxScribe] Schema initialization failed:', err);
  throw err;
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure DB schema is ready before handling any request
app.use((_req, _res, next) => {
  schemaReady.then(() => next()).catch(next);
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

// Serve static frontend files
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
if (!fs.existsSync(frontendBuildPath)) {
  console.warn(`[NyxScribe] Frontend build directory not found at ${frontendBuildPath}. Run 'npm run frontend:build' to generate it.`);
}
app.use(express.static(frontendBuildPath));

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
