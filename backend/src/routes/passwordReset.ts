import { Router } from 'express';
import { getBqService } from '../bigquery-client';

const router = Router();

router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    await getBqService().requestPasswordReset(email);
    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/reset', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    await getBqService().resetPassword(token, new_password);
    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
