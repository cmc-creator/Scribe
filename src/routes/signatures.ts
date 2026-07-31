import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateEmail } from '../middleware/validation';
import * as signatureService from '../services/signatureService';

const router = Router();

router.post(
  '/request',
  authenticate,
  validateBody(['document_id', 'document_version_id', 'requester_id', 'recipient_email', 'recipient_name']),
  validateEmail('recipient_email'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const request = await signatureService.createSignatureRequest(req.body);
      res.status(201).json({ success: true, data: request });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
);

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const request = await signatureService.getSignatureRequest(req.params.id);
    if (!request) {
      res.status(404).json({ success: false, error: 'Signature request not found' });
      return;
    }
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/:id/sign', validateBody(['signature_data']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await signatureService.submitSignature(
      req.params.id,
      req.body.signature_data,
      req.ip ?? undefined,
      req.headers['user-agent']
    );
    if (!updated) {
      res.status(400).json({ success: false, error: 'Signature request not found or not pending' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/:id/decline', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await signatureService.declineSignatureRequest(req.params.id, req.ip ?? undefined);
    if (!updated) {
      res.status(400).json({ success: false, error: 'Signature request not found or not pending' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
