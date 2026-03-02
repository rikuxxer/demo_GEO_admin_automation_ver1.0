import {
  validateProjectId,
  getCleanDatasetId,
  initializeBigQueryClient,
  BQ_LOCATION,
  getDataset,
  formatTimestampForBigQuery,
  formatDateForBigQuery,
  formatTimeForBigQuery,
  formatBoolForBigQuery,
  formatMediaIdArrayForBigQuery,
  formatDeliveryMediaForBigQuery,
} from './utils';

export async function getSegments(): Promise<any[]> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.segments\`
    ORDER BY segment_registered_at DESC
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    location: BQ_LOCATION,
  });
  return rows;
}

export async function getSegmentsByProject(project_id: string): Promise<any[]> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.segments\`
    WHERE project_id = @project_id
    ORDER BY segment_registered_at DESC
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    params: { project_id },
    location: BQ_LOCATION,
  });
  return rows;
}

export async function getSegmentById(segment_id: string): Promise<any | null> {
  if (!segment_id || typeof segment_id !== 'string' || segment_id.trim() === '') {
    return null;
  }
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT segment_id
    FROM \`${currentProjectId}.${cleanDatasetId}.segments\`
    WHERE segment_id = @segment_id
    LIMIT 1
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    params: { segment_id: segment_id.trim() },
    location: BQ_LOCATION,
  });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createSegment(segment: any): Promise<void> {
  try {
    if (!segment.segment_id || typeof segment.segment_id !== 'string' || segment.segment_id.trim() === '') {
      throw new Error('segment_id is required and must be a non-empty string');
    }
    if (!segment.project_id || typeof segment.project_id !== 'string' || segment.project_id.trim() === '') {
      throw new Error('project_id is required and must be a non-empty string');
    }

    const allowedFields = [
      'segment_id',
      'project_id',
      'segment_name',
      'segment_registered_at',
      'delivery_media',
      'media_id',
      'poi_category',
      'poi_type',
      'attribute',
      'extraction_period',
      'extraction_period_type',
      'extraction_start_date',
      'extraction_end_date',
      'extraction_dates',
      'detection_count',
      'detection_time_start',
      'detection_time_end',
      'stay_time',
      'designated_radius',
      'location_request_status',
      'data_link_status',
      'data_link_request_date',
      'data_link_scheduled_date',
      'data_coordination_date',
      'delivery_confirmed',
      'registerd_provider_segment',
      'ads_account_id',
      'provider_segment_id',
      'segment_expire_date',
    ];

    const cleanedSegment: any = {
      segment_id: segment.segment_id.trim(),
      project_id: segment.project_id.trim(),
    };

    cleanedSegment.segment_registered_at = formatTimestampForBigQuery(segment.segment_registered_at || new Date());
    if (!(segment.location_request_status != null && segment.location_request_status !== '')) {
      cleanedSegment.location_request_status = 'not_requested';
    }
    if (!(segment.data_link_status != null && segment.data_link_status !== '')) {
      cleanedSegment.data_link_status = 'before_request';
    }

    if (segment.request_confirmed !== undefined && segment.request_confirmed !== null) {
      cleanedSegment.delivery_confirmed = formatBoolForBigQuery(segment.request_confirmed);
    }

    for (const field of allowedFields) {
      if (field in segment && segment[field] !== undefined && segment[field] !== null) {
        if (field === 'extraction_start_date' || field === 'extraction_end_date' || field === 'data_coordination_date') {
          cleanedSegment[field] = formatDateForBigQuery(segment[field]);
        } else if (field === 'data_link_request_date' || field === 'data_link_scheduled_date' || field === 'segment_expire_date') {
          cleanedSegment[field] = formatDateForBigQuery(segment[field]);
        } else if (field === 'detection_time_start' || field === 'detection_time_end') {
          cleanedSegment[field] = formatTimeForBigQuery(segment[field]);
        } else if (field === 'delivery_confirmed' || field === 'registerd_provider_segment') {
          cleanedSegment[field] = formatBoolForBigQuery(segment[field]);
        } else if (field === 'segment_registered_at') {
          cleanedSegment[field] = formatTimestampForBigQuery(segment[field] || new Date());
        } else if (field === 'media_id') {
          const arr = formatMediaIdArrayForBigQuery(segment[field]);
          if (arr) cleanedSegment[field] = arr;
        } else if (field === 'delivery_media') {
          const arr = formatDeliveryMediaForBigQuery(segment[field]);
          if (arr) cleanedSegment[field] = arr;
        } else if (field === 'detection_count') {
          const n = parseInt(String(segment[field]), 10);
          if (!Number.isNaN(n)) cleanedSegment[field] = n;
        } else if (field === 'extraction_dates') {
          if (Array.isArray(segment[field])) {
            const arr = (segment[field] as any[]).filter((s: any) => s != null && String(s).trim() !== '');
            if (arr.length > 0) {
              cleanedSegment[field] = arr;
            }
          }
        } else {
          cleanedSegment[field] = segment[field];
        }
      }
    }

    const now = new Date();
    cleanedSegment.created_at = formatTimestampForBigQuery(segment.created_at || now);
    cleanedSegment.updated_at = formatTimestampForBigQuery(segment.updated_at || now);

    console.log('📋 Cleaned segment data for BigQuery:', {
      segment_id: cleanedSegment.segment_id,
      project_id: cleanedSegment.project_id,
      extraction_start_date: cleanedSegment.extraction_start_date,
      extraction_end_date: cleanedSegment.extraction_end_date,
      allFields: Object.keys(cleanedSegment),
    });

    await getDataset().table('segments').insert([cleanedSegment], { ignoreUnknownValues: true });
  } catch (err: any) {
    console.error('[BQ insert segments] message:', err?.message);
    console.error('[BQ insert segments] errors:', JSON.stringify(err?.errors, null, 2));

    if (err.errors && Array.isArray(err.errors)) {
      err.errors.forEach((error: any, index: number) => {
        console.error(`[BQ insert segments] error[${index}]:`, {
          message: error.message,
          reason: error.reason,
          location: error.location,
        });
      });
    }

    throw err;
  }
}

export async function updateSegment(segment_id: string, updates: any): Promise<void> {
  const currentProjectId = validateProjectId();

  const processedUpdates = { ...updates };
  if ('media_id' in processedUpdates && processedUpdates.media_id !== undefined) {
    const arr = formatMediaIdArrayForBigQuery(processedUpdates.media_id);
    processedUpdates.media_id = arr;
  }
  if ('delivery_media' in processedUpdates && processedUpdates.delivery_media !== undefined) {
    const arr = formatDeliveryMediaForBigQuery(processedUpdates.delivery_media);
    processedUpdates.delivery_media = arr;
  }
  if ('extraction_dates' in processedUpdates && processedUpdates.extraction_dates !== undefined) {
    const v = processedUpdates.extraction_dates;
    const arr = Array.isArray(v)
      ? v.filter((s: any) => s != null && String(s).trim() !== '').map((s: any) => String(s).trim())
      : (typeof v === 'string' && v.trim() ? [v.trim()] : []);
    processedUpdates.extraction_dates = arr;
  }
  if ('delivery_confirmed' in processedUpdates && processedUpdates.delivery_confirmed !== undefined) {
    processedUpdates.delivery_confirmed = formatBoolForBigQuery(processedUpdates.delivery_confirmed);
  }
  if ('registerd_provider_segment' in processedUpdates && processedUpdates.registerd_provider_segment !== undefined) {
    processedUpdates.registerd_provider_segment = formatBoolForBigQuery(processedUpdates.registerd_provider_segment);
  }

  const setClause = Object.keys(processedUpdates)
    .map(key => `${key} = @${key}`)
    .join(', ');

  const cleanDatasetId = getCleanDatasetId();
  const query = `
    UPDATE \`${currentProjectId}.${cleanDatasetId}.segments\`
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
    WHERE segment_id = @segment_id
  `;

  const allParams = { segment_id, ...processedUpdates };

  const paramTypes: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(allParams)) {
    if (Array.isArray(value)) {
      paramTypes[key] = ['STRING'];
    }
  }

  await initializeBigQueryClient().query({
    query,
    params: allParams,
    ...(Object.keys(paramTypes).length > 0 ? { types: paramTypes } : {}),
    location: BQ_LOCATION,
  });
}

export async function deleteSegment(segment_id: string): Promise<void> {
  if (!segment_id || typeof segment_id !== 'string' || segment_id.trim() === '') {
    throw new Error('segment_id is required');
  }
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const segId = segment_id.trim();
  await initializeBigQueryClient().query({
    query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.pois\` WHERE segment_id = @segment_id`,
    params: { segment_id: segId },
    location: BQ_LOCATION,
  });
  await initializeBigQueryClient().query({
    query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.segments\` WHERE segment_id = @segment_id`,
    params: { segment_id: segId },
    location: BQ_LOCATION,
  });
}
