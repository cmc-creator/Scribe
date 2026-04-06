import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import * as documentService from '../services/documentService';

const router = Router();

const UPLOAD_DIR = path.resolve('./uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID();
    // Sanitize original filename to prevent path traversal
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${unique}-${safeName}`);
  },
});
const upload = multer({ storage });

router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, category, owner_id, search } = req.query as Record<string, string>;
    const docs = documentService.listDocuments({ status, category, owner_id, search });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post(
  '/',
  authenticate,
  validateBody(['title', 'owner_id']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const doc = documentService.createDocument(req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
);

router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = documentService.getDocument(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.put('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = documentService.updateDocument(req.params.id, req.body, req.user?.id);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.delete('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const archived = documentService.archiveDocument(req.params.id, req.user?.id);
    if (!archived) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }
    res.json({ success: true, data: { archived: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post(
  '/:id/versions',
  authenticate,
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }
      const fileBuffer = fs.readFileSync(req.file.path);
      const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const version = documentService.createDocumentVersion(
        req.params.id,
        req.file.path,
        req.user?.id ?? 'unknown',
        {
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          content_hash: contentHash,
          change_notes: req.body.change_notes,
        }
      );
      res.status(201).json({ success: true, data: version });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
);

router.get('/:id/versions', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const versions = documentService.getDocumentVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
