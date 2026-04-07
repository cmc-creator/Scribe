import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import * as distributionService from '../services/distributionService';
import { validateBody, validateEmail } from '../middleware/validation';

const router = Router();

router.post(
  '/send',
  authenticate,
  validateBody(['document_id', 'document_version_id', 'sender_id', 'recipient_email']),
  validateEmail('recipient_email'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const record = await distributionService.sendDocument(req.body);
      res.status(201).json({ success: true, data: record });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
);

router.post(
  '/bulk',
  authenticate,
  validateBody(['document_id', 'document_version_id', 'sender_id', 'recipients']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { document_id, document_version_id, sender_id, recipients } = req.body as {
        document_id: string;
        document_version_id: string;
        sender_id: string;
        recipients: { email: string; name?: string }[];
      };

      if (!Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ success: false, error: 'recipients must be a non-empty array' });
        return;
      }

      const result = await distributionService.bulkDistribute(
        document_id,
        document_version_id,
        sender_id,
        recipients
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
);

router.get('/batches', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await distributionService.getDistributionBatches(req.user?.id);
    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.get('/batches/:batchId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const records = await distributionService.getBatchStatus(req.params.batchId);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
