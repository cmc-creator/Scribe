import { Router } from 'express';
import { createInitialAdmin, needsInitialSetup, signIn } from '../services/authService';

const router = Router();

function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12;
}

router.get('/setup-status', async (_req, res) => {
  try {
    res.json({ success: true, data: { needsSetup: await needsInitialSetup() } });
  } catch {
    res.status(503).json({ success: false, error: 'Authentication service is unavailable.' });
  }
});

router.post('/setup', async (req, res) => {
  const { email, name, password, setupSecret } = req.body ?? {};
  if (typeof email !== 'string' || typeof name !== 'string' || !isValidPassword(password) || typeof setupSecret !== 'string') {
    res.status(400).json({ success: false, error: 'Name, email, setup secret, and a password of at least 12 characters are required.' });
    return;
  }
  try {
    res.status(201).json({ success: true, data: await createInitialAdmin({ email, name, password, setupSecret }) });
  } catch (error) {
    res.status(403).json({ success: false, error: error instanceof Error ? error.message : 'Initial setup failed.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ success: false, error: 'Email and password are required.' });
    return;
  }
  try {
    const session = await signIn(email, password);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }
    res.json({ success: true, data: session });
  } catch {
    res.status(503).json({ success: false, error: 'Authentication service is unavailable.' });
  }
});

export default router;
