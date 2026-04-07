import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import * as alertService from '../services/alertService';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const daysAhead = parseInt((req.query.days as string) ?? '30', 10);
    const alerts = await alertService.getExpiryAlerts(daysAhead);
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/upcoming', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const daysAhead = parseInt((req.query.days as string) ?? '7', 10);
    const alerts = await alertService.getUpcomingExpirations(daysAhead);
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/:documentId/acknowledge', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ok = await alertService.acknowledgeAlert(req.params.documentId);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }
    res.json({ success: true, data: { acknowledged: true } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
