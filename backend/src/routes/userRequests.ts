import { Router } from 'express';
import { getBqService } from '../bigquery-client';
import { wrapAsync } from '../middleware/async-wrapper';

const router = Router();

// ==================== ユーザー登録申請 ====================

router.get('/', async (req, res) => {
  try {
    const requests = await getBqService().getUserRequests();
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', wrapAsync(async (req, res) => {
  const request = await getBqService().createUserRequest(req.body);
  res.status(201).json(request);
}));

router.post('/:request_id/approve', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reviewed_by, comment } = req.body;
    await getBqService().approveUserRequest(request_id, reviewed_by, comment);
    res.json({ message: 'User request approved successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:request_id/reject', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reviewed_by, comment } = req.body;
    if (!comment) {
      return res.status(400).json({ error: 'Comment is required for rejection' });
    }
    await getBqService().rejectUserRequest(request_id, reviewed_by, comment);
    res.json({ message: 'User request rejected successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
