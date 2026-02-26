import { Router } from 'express';
import { wrapAsync } from './middleware/async-wrapper';
import { estimateUU, isSimConfigured } from './sim-bigquery-client';
import type { SimConditions } from './sim-bigquery-client';

const router = Router();

router.get('/status', wrapAsync(async (_req, res) => {
  res.json({ configured: isSimConfigured() });
}));

router.post('/estimate', wrapAsync(async (req, res) => {
  const conditions: SimConditions = req.body;

  if (!conditions.date_start || !conditions.date_end) {
    res.status(400).json({
      error: 'date_start と date_end は必須です',
      type: 'ValidationError',
    });
    return;
  }

  if (conditions.date_start > conditions.date_end) {
    res.status(400).json({
      error: '開始日は終了日以前である必要があります',
      type: 'ValidationError',
    });
    return;
  }

  const result = await estimateUU(conditions);
  res.json(result);
}));

export default router;
