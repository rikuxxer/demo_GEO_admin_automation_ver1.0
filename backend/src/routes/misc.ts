import { Router } from 'express';
import { getBqService } from '../bigquery-client';

const router = Router();

// ==================== 編集依頼 ====================

router.get('/edit-requests', async (req, res) => {
  try {
    const rows = await getBqService().getEditRequests();
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/edit-requests', async (req, res) => {
  try {
    await getBqService().createEditRequest(req.body);
    res.status(201).json({ message: 'Edit request created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/edit-requests/:request_id', async (req, res) => {
  try {
    await getBqService().updateEditRequest(req.params.request_id, req.body);
    res.json({ message: 'Edit request updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/edit-requests/:request_id', async (req, res) => {
  try {
    await getBqService().deleteEditRequest(req.params.request_id);
    res.json({ message: 'Edit request deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 来店計測地点グループ ====================

router.get('/visit-measurement-groups/project/:project_id', async (req, res) => {
  try {
    const rows = await getBqService().getVisitMeasurementGroups(req.params.project_id);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/visit-measurement-groups', async (req, res) => {
  try {
    await getBqService().createVisitMeasurementGroup(req.body);
    res.status(201).json({ message: 'Visit measurement group created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/visit-measurement-groups/:group_id', async (req, res) => {
  try {
    await getBqService().updateVisitMeasurementGroup(req.params.group_id, req.body);
    res.json({ message: 'Visit measurement group updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/visit-measurement-groups/:group_id', async (req, res) => {
  try {
    await getBqService().deleteVisitMeasurementGroup(req.params.group_id);
    res.json({ message: 'Visit measurement group deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 機能リクエスト ====================

router.get('/feature-requests', async (req, res) => {
  try {
    const rows = await getBqService().getFeatureRequests();
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/feature-requests', async (req, res) => {
  try {
    await getBqService().createFeatureRequest(req.body);
    res.status(201).json({ message: 'Feature request created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/feature-requests/:request_id', async (req, res) => {
  try {
    await getBqService().updateFeatureRequest(req.params.request_id, req.body);
    res.json({ message: 'Feature request updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== レポート作成依頼 ====================

router.get('/report-requests', async (req, res) => {
  try {
    const project_id = req.query.project_id as string | undefined;
    const status = req.query.status as string | undefined;
    const rows = await getBqService().getReportRequests(project_id, status);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/report-requests/:request_id', async (req, res) => {
  try {
    const { request_id } = req.params;
    const reportRequest = await getBqService().getReportRequestById(request_id);
    if (!reportRequest) {
      return res.status(404).json({ error: 'Report request not found' });
    }
    res.json(reportRequest);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/report-requests', async (req, res) => {
  try {
    await getBqService().createReportRequest(req.body);
    res.status(201).json({ message: 'Report request created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/report-requests/:request_id', async (req, res) => {
  try {
    const { request_id } = req.params;
    await getBqService().updateReportRequest(request_id, req.body);
    res.json({ message: 'Report request updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/report-requests/:request_id/approve', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reviewed_by, review_comment } = req.body;
    await getBqService().updateReportRequest(request_id, {
      status: 'approved',
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      review_comment,
    });
    res.json({ message: 'Report request approved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/report-requests/:request_id/reject', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reviewed_by, review_comment } = req.body;
    await getBqService().updateReportRequest(request_id, {
      status: 'rejected',
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      review_comment,
    });
    res.json({ message: 'Report request rejected successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 変更履歴 ====================

router.get('/change-history', async (req, res) => {
  try {
    const project_id = req.query.project_id as string | undefined;
    const rows = await getBqService().getChangeHistories(project_id);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/change-history', async (req, res) => {
  try {
    await getBqService().insertChangeHistory(req.body);
    res.status(201).json({ message: 'Change history recorded successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
