import {
  validateProjectId,
  getCleanDatasetId,
  initializeBigQueryClient,
  BQ_LOCATION,
  getDataset,
  formatTimestampForBigQuery,
} from './utils';
import { updateSegment } from './segment';

function normalizePoiType(poi: any): string {
  if (poi.polygon != null) {
    const p = typeof poi.polygon === 'string' ? (() => { try { return JSON.parse(poi.polygon); } catch { return []; } })() : poi.polygon;
    if (Array.isArray(p) && p.length > 0) return 'polygon';
  }
  const t = poi.poi_type;
  if (t === 'polygon' || t === 'prefecture' || t === 'manual') return t;
  return t && typeof t === 'string' ? t : 'manual';
}

export async function getPois(): Promise<any[]> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
    ORDER BY created_at DESC
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    location: BQ_LOCATION,
  });
  return rows;
}

export async function getPoisByProject(project_id: string): Promise<any[]> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
    WHERE project_id = @project_id
    ORDER BY created_at DESC
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    params: { project_id },
  });
  return rows;
}

export async function getPoisBySegment(segment_id: string): Promise<any[]> {
  if (!segment_id || typeof segment_id !== 'string' || segment_id.trim() === '') {
    return [];
  }
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT poi_id, segment_id, poi_type, polygon
    FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
    WHERE segment_id = @segment_id
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    params: { segment_id: segment_id.trim() },
    location: BQ_LOCATION,
  });
  return rows || [];
}

export async function getPoiById(poi_id: string): Promise<any | null> {
  if (!poi_id || typeof poi_id !== 'string' || poi_id.trim() === '') {
    return null;
  }
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT poi_id
    FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
    WHERE poi_id = @poi_id
    LIMIT 1
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    params: { poi_id: poi_id.trim() },
    location: BQ_LOCATION,
  });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createPoi(poi: any): Promise<void> {
  try {
    if (!poi.poi_id || typeof poi.poi_id !== 'string' || poi.poi_id.trim() === '') {
      throw new Error('poi_id is required and must be a non-empty string');
    }
    if (!poi.project_id || typeof poi.project_id !== 'string' || poi.project_id.trim() === '') {
      throw new Error('project_id is required and must be a non-empty string');
    }
    if (!poi.poi_name || typeof poi.poi_name !== 'string' || poi.poi_name.trim() === '') {
      throw new Error('poi_name is required and must be a non-empty string');
    }

    const allowedFields = [
      'poi_id',
      'project_id',
      'segment_id',
      'location_id',
      'poi_name',
      'address',
      'latitude',
      'longitude',
      'prefectures',
      'cities',
      'poi_type',
      'poi_category',
      'designated_radius',
      'setting_flag',
      'visit_measurement_group_id',
      'polygon',
    ];

    const cleanedPoi: any = {
      poi_id: poi.poi_id.trim(),
      project_id: poi.project_id.trim(),
      poi_name: poi.poi_name.trim(),
    };

    for (const field of allowedFields) {
      if (field in poi && poi[field] !== undefined && poi[field] !== null) {
        if (field === 'latitude' || field === 'longitude') {
          const numValue = typeof poi[field] === 'string' ? parseFloat(poi[field]) : poi[field];
          if (!isNaN(numValue)) {
            cleanedPoi[field] = numValue;
          }
        } else if (field === 'prefectures' || field === 'cities') {
          if (Array.isArray(poi[field])) {
            cleanedPoi[field] = poi[field];
          } else if (typeof poi[field] === 'string') {
            try {
              cleanedPoi[field] = JSON.parse(poi[field]);
            } catch {
              cleanedPoi[field] = [poi[field]];
            }
          }
        } else if (field === 'polygon') {
          if (Array.isArray(poi[field]) && poi[field].length > 0) {
            cleanedPoi[field] = JSON.stringify(poi[field]);
          } else if (typeof poi[field] === 'string') {
            cleanedPoi[field] = poi[field];
          }
        } else {
          cleanedPoi[field] = poi[field];
        }
      }
    }

    const now = new Date();
    cleanedPoi.created_at = formatTimestampForBigQuery(poi.created_at || now);
    cleanedPoi.updated_at = formatTimestampForBigQuery(poi.updated_at || now);

    if (cleanedPoi.segment_id) {
      const existingPois = await getPoisBySegment(cleanedPoi.segment_id);
      const newType = normalizePoiType(cleanedPoi);
      for (const existing of existingPois) {
        const existingType = normalizePoiType(existing);
        if (existingType !== newType) {
          throw new Error(
            `このセグメントには既に「${existingType}」タイプの地点が登録されています。同一セグメント内では地点タイプ（任意地点・都道府県・ポリゴン）を1種類に統一してください。`
          );
        }
      }
    }

    console.log('📋 Cleaned POI data for BigQuery:', {
      poi_id: cleanedPoi.poi_id,
      project_id: cleanedPoi.project_id,
      poi_name: cleanedPoi.poi_name,
      allFields: Object.keys(cleanedPoi),
    });

    await getDataset().table('pois').insert([cleanedPoi], { ignoreUnknownValues: true });

    if (cleanedPoi.segment_id && String(cleanedPoi.segment_id).trim()) {
      const segmentId = String(cleanedPoi.segment_id).trim();
      const poiType = normalizePoiType(cleanedPoi);
      await updateSegment(segmentId, { poi_type: poiType });
      console.log(`[BQ] segments.poi_type を更新: segment_id=${segmentId}, poi_type=${poiType}`);
    }
  } catch (err: any) {
    console.error('[BQ insert pois] message:', err?.message);
    console.error('[BQ insert pois] errors:', JSON.stringify(err?.errors, null, 2));

    if (err.errors && Array.isArray(err.errors)) {
      err.errors.forEach((error: any, index: number) => {
        console.error(`[BQ insert pois] error[${index}]:`, {
          message: error.message,
          reason: error.reason,
          location: error.location,
        });
      });
    }

    throw err;
  }
}

export async function createPoisBulk(pois: any[]): Promise<void> {
  try {
    const cleanedPois = pois.map(poi => {
      if (!poi.poi_id || typeof poi.poi_id !== 'string' || poi.poi_id.trim() === '') {
        throw new Error('poi_id is required and must be a non-empty string');
      }
      if (!poi.project_id || typeof poi.project_id !== 'string' || poi.project_id.trim() === '') {
        throw new Error('project_id is required and must be a non-empty string');
      }
      if (!poi.poi_name || typeof poi.poi_name !== 'string' || poi.poi_name.trim() === '') {
        throw new Error('poi_name is required and must be a non-empty string');
      }

      const allowedFields = [
        'poi_id',
        'project_id',
        'segment_id',
        'location_id',
        'poi_name',
        'address',
        'latitude',
        'longitude',
        'prefectures',
        'cities',
        'poi_type',
        'poi_category',
        'designated_radius',
        'setting_flag',
        'visit_measurement_group_id',
        'polygon',
      ];

      const cleanedPoi: any = {
        poi_id: poi.poi_id.trim(),
        project_id: poi.project_id.trim(),
        poi_name: poi.poi_name.trim(),
      };

      for (const field of allowedFields) {
        if (field in poi && poi[field] !== undefined && poi[field] !== null) {
          if (field === 'latitude' || field === 'longitude') {
            const numValue = typeof poi[field] === 'string' ? parseFloat(poi[field]) : poi[field];
            if (!isNaN(numValue)) {
              cleanedPoi[field] = numValue;
            }
          } else if (field === 'prefectures' || field === 'cities') {
            if (Array.isArray(poi[field])) {
              cleanedPoi[field] = poi[field];
            } else if (typeof poi[field] === 'string') {
              try {
                cleanedPoi[field] = JSON.parse(poi[field]);
              } catch {
                cleanedPoi[field] = [poi[field]];
              }
            }
          } else if (field === 'polygon') {
            if (Array.isArray(poi[field]) && poi[field].length > 0) {
              cleanedPoi[field] = JSON.stringify(poi[field]);
            } else if (typeof poi[field] === 'string') {
              cleanedPoi[field] = poi[field];
            }
          } else {
            cleanedPoi[field] = poi[field];
          }
        }
      }

      const now = new Date();
      cleanedPoi.created_at = formatTimestampForBigQuery(poi.created_at || now);
      cleanedPoi.updated_at = formatTimestampForBigQuery(poi.updated_at || now);

      return cleanedPoi;
    });

    const segmentToTypes = new Map<string, Set<string>>();
    for (const p of cleanedPois) {
      if (!p.segment_id) continue;
      const segId = String(p.segment_id).trim();
      const type = normalizePoiType(p);
      if (!segmentToTypes.has(segId)) segmentToTypes.set(segId, new Set());
      segmentToTypes.get(segId)!.add(type);
    }
    for (const [segId, types] of segmentToTypes) {
      if (types.size > 1) {
        throw new Error(
          `セグメント「${segId}」に複数の地点タイプ（${[...types].join('・')}）を含めています。同一セグメント内では地点タイプを1種類に統一してください。`
        );
      }
      const existingPois = await getPoisBySegment(segId);
      const newType = [...types][0];
      for (const existing of existingPois) {
        const existingType = normalizePoiType(existing);
        if (existingType !== newType) {
          throw new Error(
            `このセグメントには既に「${existingType}」タイプの地点が登録されています。同一セグメント内では地点タイプを1種類に統一してください。`
          );
        }
      }
    }

    console.log(`📋 Cleaned ${cleanedPois.length} POIs for BigQuery bulk insert`);

    await getDataset().table('pois').insert(cleanedPois, { ignoreUnknownValues: true });

    for (const [segId, types] of segmentToTypes) {
      const poiType = [...types][0];
      await updateSegment(segId, { poi_type: poiType });
      console.log(`[BQ] segments.poi_type を更新（一括）: segment_id=${segId}, poi_type=${poiType}`);
    }
  } catch (err: any) {
    console.error('[BQ insert pois bulk] message:', err?.message);
    console.error('[BQ insert pois bulk] errors:', JSON.stringify(err?.errors, null, 2));

    if (err.errors && Array.isArray(err.errors)) {
      err.errors.forEach((error: any, index: number) => {
        console.error(`[BQ insert pois bulk] error[${index}]:`, {
          message: error.message,
          reason: error.reason,
          location: error.location,
        });
      });
    }

    throw err;
  }
}

export async function updatePoi(poi_id: string, updates: any): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();

  if ('segment_id' in updates || 'poi_type' in updates || 'polygon' in updates) {
    const [currentRows] = await initializeBigQueryClient().query({
      query: `SELECT segment_id, poi_type, polygon FROM \`${currentProjectId}.${cleanDatasetId}.pois\` WHERE poi_id = @poi_id`,
      params: { poi_id },
      location: BQ_LOCATION,
    });
    const current = Array.isArray(currentRows) && currentRows.length > 0 ? currentRows[0] : null;
    const targetSegmentId = updates.segment_id != null ? String(updates.segment_id).trim() : (current?.segment_id ?? '');
    const merged = { ...current, ...updates };
    const targetType = normalizePoiType(merged);
    if (targetSegmentId) {
      const existingPois = await getPoisBySegment(targetSegmentId);
      for (const p of existingPois) {
        if (p.poi_id === poi_id) continue;
        const existingType = normalizePoiType(p);
        if (existingType !== targetType) {
          throw new Error(
            `このセグメントには既に「${existingType}」タイプの地点が登録されています。同一セグメント内では地点タイプを1種類に統一してください。`
          );
        }
      }
    }
  }

  const poiAllowedFields = new Set([
    'project_id',
    'segment_id',
    'location_id',
    'poi_name',
    'address',
    'latitude',
    'longitude',
    'prefectures',
    'cities',
    'poi_type',
    'poi_category',
    'designated_radius',
    'setting_flag',
    'visit_measurement_group_id',
    'polygon',
  ]);
  const filteredUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (poiAllowedFields.has(key)) {
      filteredUpdates[key] = value;
    }
  }

  const processedUpdates = { ...filteredUpdates };
  if ('prefectures' in processedUpdates && processedUpdates.prefectures !== undefined) {
    const v = processedUpdates.prefectures;
    if (Array.isArray(v)) {
      processedUpdates.prefectures = v;
    } else if (typeof v === 'string') {
      try {
        processedUpdates.prefectures = JSON.parse(v);
      } catch {
        processedUpdates.prefectures = [v];
      }
    }
  }
  if ('cities' in processedUpdates && processedUpdates.cities !== undefined) {
    const v = processedUpdates.cities;
    if (Array.isArray(v)) {
      processedUpdates.cities = v;
    } else if (typeof v === 'string') {
      try {
        processedUpdates.cities = JSON.parse(v);
      } catch {
        processedUpdates.cities = [v];
      }
    }
  }
  if ('polygon' in processedUpdates && processedUpdates.polygon !== undefined && processedUpdates.polygon !== null) {
    const v = processedUpdates.polygon;
    if (Array.isArray(v) && v.length > 0) {
      processedUpdates.polygon = JSON.stringify(v);
    }
  }

  const setClause = Object.keys(processedUpdates)
    .map(key => `${key} = @${key}`)
    .join(', ');
  const query = `
    UPDATE \`${currentProjectId}.${cleanDatasetId}.pois\`
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
    WHERE poi_id = @poi_id
  `;

  const allPoiParams = { poi_id, ...processedUpdates };

  const poiParamTypes: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(allPoiParams)) {
    if (Array.isArray(value)) {
      poiParamTypes[key] = ['STRING'];
    }
  }

  await initializeBigQueryClient().query({
    query,
    params: allPoiParams,
    ...(Object.keys(poiParamTypes).length > 0 ? { types: poiParamTypes } : {}),
    location: BQ_LOCATION,
  });

  if ('segment_id' in updates || 'poi_type' in updates || 'polygon' in updates) {
    const [rows] = await initializeBigQueryClient().query({
      query: `SELECT segment_id, poi_type, polygon FROM \`${currentProjectId}.${cleanDatasetId}.pois\` WHERE poi_id = @poi_id`,
      params: { poi_id },
      location: BQ_LOCATION,
    });
    const updated = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (updated?.segment_id && String(updated.segment_id).trim()) {
      const segId = String(updated.segment_id).trim();
      const poiType = normalizePoiType(updated);
      await updateSegment(segId, { poi_type: poiType });
      console.log(`[BQ] segments.poi_type を更新（updatePoi後）: segment_id=${segId}, poi_type=${poiType}`);
    }
  }
}

export async function deletePoi(poi_id: string): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();

  const [beforeRows] = await initializeBigQueryClient().query({
    query: `SELECT segment_id FROM \`${currentProjectId}.${cleanDatasetId}.pois\` WHERE poi_id = @poi_id`,
    params: { poi_id },
    location: BQ_LOCATION,
  });
  const segmentIdBefore = Array.isArray(beforeRows) && beforeRows.length > 0 ? (beforeRows[0] as any)?.segment_id : null;

  const query = `
    DELETE FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
    WHERE poi_id = @poi_id
  `;
  await initializeBigQueryClient().query({
    query,
    params: { poi_id },
    location: BQ_LOCATION,
  });

  if (segmentIdBefore && String(segmentIdBefore).trim()) {
    const segId = String(segmentIdBefore).trim();
    const remaining = await getPoisBySegment(segId);
    if (remaining.length === 0) {
      await updateSegment(segId, { poi_type: null });
      console.log(`[BQ] segments.poi_type をクリア（当該セグメントのPOIが0件）: segment_id=${segId}`);
    }
  }
}
