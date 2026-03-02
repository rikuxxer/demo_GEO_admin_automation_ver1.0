import { Router } from 'express';
import { getBqService } from '../bigquery-client';

const router = Router();

router.post('/export', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'rows must be an array' });
    }
    const result = await getBqService().exportToGoogleSheets(rows);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/export-with-accumulation', async (req, res) => {
  try {
    const { rows, projectId, segmentId, exportedBy, exportedByName, deferExport } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows配列が必要です' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'projectIdが必要です' });
    }

    const result = await getBqService().exportToGoogleSheetsWithAccumulation(
      rows,
      projectId,
      segmentId,
      exportedBy,
      exportedByName,
      deferExport ?? false,
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'エクスポート処理中にエラーが発生しました' });
  }
});

router.post('/run-scheduled-export', async (req, res) => {
  try {
    const token = req.headers['x-scheduler-token'];
    const expectedToken = process.env.SCHEDULER_SECRET;
    if (!expectedToken || token !== expectedToken) {
      return res.status(401).json({
        error: '認証に失敗しました',
        type: 'Unauthorized',
        request_id: (req as any).requestId,
      });
    }

    const result = await getBqService().runScheduledExport();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '定期バッチエクスポート中にエラーが発生しました' });
  }
});

router.get('/exports', async (req, res) => {
  try {
    const { projectId, status, limit } = req.query;
    const exports = await getBqService().getSheetExports(
      projectId as string,
      status as string,
      limit ? parseInt(limit as string) : 100,
    );
    res.json(exports);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'エクスポート履歴の取得に失敗しました' });
  }
});

router.get('/exports/:exportId/data', async (req, res) => {
  try {
    const { exportId } = req.params;
    const exportData = await getBqService().getSheetExportData(exportId);
    res.json(exportData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'エクスポートデータの取得に失敗しました' });
  }
});

router.post('/exports/:exportId/reexport', async (req, res) => {
  try {
    const { exportId } = req.params;
    const exportData = await getBqService().getSheetExportData(exportId);

    if (exportData.length === 0) {
      return res.status(404).json({ error: 'エクスポートデータが見つかりません' });
    }

    const rows = exportData.map((data: any) => ({
      category_id: data.category_id,
      brand_id: data.brand_id,
      brand_name: data.brand_name,
      poi_id: data.poi_id,
      poi_name: data.poi_name,
      latitude: data.latitude,
      longitude: data.longitude,
      prefecture: data.prefecture,
      city: data.city,
      radius: data.radius,
      polygon: data.polygon,
      setting_flag: data.setting_flag,
      created: data.created,
    }));

    const exports = await getBqService().getSheetExports();
    const exportRecord = exports.find((e: any) => e.export_id === exportId);

    if (!exportRecord) {
      return res.status(404).json({ error: 'エクスポート履歴が見つかりません' });
    }

    const result = await getBqService().exportToGoogleSheetsWithAccumulation(
      rows,
      exportRecord.project_id,
      exportRecord.segment_id,
      exportRecord.exported_by,
      exportRecord.exported_by_name,
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '再エクスポート処理中にエラーが発生しました' });
  }
});

export default router;
