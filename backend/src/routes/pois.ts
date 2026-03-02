import { Router } from 'express';
import { getBqService } from '../bigquery-client';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const pois = await getBqService().getPois();
    res.json(pois);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/project/:project_id', async (req, res) => {
  try {
    const pois = await getBqService().getPoisByProject(req.params.project_id);
    res.json(pois);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const poiId = req.body?.poi_id;
    if (poiId) {
      const existing = await getBqService().getPoiById(poiId);
      if (existing) {
        return res.status(409).json({
          error: 'この地点IDは既に存在します。再度登録できません。',
          code: 'POI_ALREADY_EXISTS',
        });
      }
    }
    await getBqService().createPoi(req.body);
    res.status(201).json({ message: 'POI created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    await getBqService().createPoisBulk(req.body.pois);
    res.status(201).json({ message: 'POIs created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:poi_id', async (req, res) => {
  try {
    await getBqService().updatePoi(req.params.poi_id, req.body);
    res.json({ message: 'POI updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:poi_id', async (req, res) => {
  try {
    await getBqService().deletePoi(req.params.poi_id);
    res.json({ message: 'POI deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
