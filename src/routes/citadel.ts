import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import * as citadelService from '../services/citadelService';

const router = Router();

router.post('/check/:documentId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const record = await citadelService.checkCompliance(req.params.documentId);
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/status/:documentId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const record = citadelService.getComplianceStatus(req.params.documentId);
    if (!record) {
      res.status(404).json({ success: false, error: 'No compliance record found' });
      return;
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/sync', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await citadelService.syncAllDocuments();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
