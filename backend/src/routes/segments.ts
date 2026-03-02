import { Router } from 'express';
import { getBqService } from '../bigquery-client';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const segments = await getBqService().getSegments();
    res.json(segments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/project/:project_id', async (req, res) => {
  try {
    const segments = await getBqService().getSegmentsByProject(req.params.project_id);
    res.json(segments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const segmentId = req.body?.segment_id;
    if (segmentId) {
      const existing = await getBqService().getSegmentById(segmentId);
      if (existing) {
        return res.status(409).json({
          error: 'このセグメントIDは既に存在します。再度登録できません。',
          code: 'SEGMENT_ALREADY_EXISTS',
        });
      }
    }
    await getBqService().createSegment(req.body);
    res.status(201).json({ message: 'Segment created successfully' });
  } catch (error: any) {
    const payload: { error: string; bqErrors?: unknown } = { error: error?.message ?? 'Unknown error' };
    if (error?.errors && Array.isArray(error.errors)) {
      payload.bqErrors = error.errors;
    }
    res.status(500).json(payload);
  }
});

router.put('/:segment_id', async (req, res) => {
  try {
    await getBqService().updateSegment(req.params.segment_id, req.body);
    res.json({ message: 'Segment updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:segment_id', async (req, res) => {
  try {
    await getBqService().deleteSegment(req.params.segment_id);
    res.json({ message: 'Segment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
