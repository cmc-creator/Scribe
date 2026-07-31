import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import * as documentService from '../services/documentService';

const router = Router();

// Use memory storage so the file buffer is available for cloud upload
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, category, owner_id, search } = req.query as Record<string, string>;
    const docs = await documentService.listDocuments({ status, category, owner_id, search });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post(
  '/',
  authenticate,
  validateBody(['title', 'owner_id']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const doc = await documentService.createDocument(req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
);

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await documentService.getDocument(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await documentService.updateDocument(req.params.id, req.body, req.user?.id);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const archived = await documentService.archiveDocument(req.params.id, req.user?.id);
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      // Sanitize original filename to prevent path traversal
      const safeName = `${crypto.randomUUID()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const contentHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

      // Upload file buffer to Vercel Blob
      const blob = await put(safeName, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
      });

      const version = await documentService.createDocumentVersion(
        req.params.id,
        blob.url,
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

router.get('/:id/versions', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const versions = await documentService.getDocumentVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
