import {
  validateProjectId,
  getCleanDatasetId,
  initializeBigQueryClient,
  BQ_LOCATION,
  bqTimestamp,
  bqDate,
  bqTime,
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

    cleanedSegment.segment_registered_at = bqTimestamp(segment.segment_registered_at || new Date());
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
          cleanedSegment[field] = bqDate(segment[field]);
        } else if (field === 'data_link_request_date' || field === 'data_link_scheduled_date' || field === 'segment_expire_date') {
          cleanedSegment[field] = bqDate(segment[field]);
        } else if (field === 'detection_time_start' || field === 'detection_time_end') {
          cleanedSegment[field] = bqTime(segment[field]);
        } else if (field === 'delivery_confirmed' || field === 'registerd_provider_segment') {
          cleanedSegment[field] = formatBoolForBigQuery(segment[field]);
        } else if (field === 'segment_registered_at') {
          cleanedSegment[field] = bqTimestamp(segment[field] || new Date());
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
    cleanedSegment.created_at = bqTimestamp(segment.created_at || now);
    cleanedSegment.updated_at = bqTimestamp(segment.updated_at || now);

    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const columns = Object.keys(cleanedSegment);
    const insertQuery = `
      INSERT INTO \`${currentProjectId}.${cleanDatasetId}.segments\`
      (${columns.join(', ')})
      VALUES (${columns.map(c => `@${c}`).join(', ')})
    `;

    const insertParamTypes: Record<string, string | string[]> = {};
    for (const f of ['segment_registered_at', 'created_at', 'updated_at']) {
      if (f in cleanedSegment) insertParamTypes[f] = 'TIMESTAMP';
    }
    for (const f of ['extraction_start_date', 'extraction_end_date', 'data_coordination_date',
                     'data_link_request_date', 'data_link_scheduled_date', 'segment_expire_date']) {
      if (f in cleanedSegment) insertParamTypes[f] = 'DATE';
    }
    for (const f of ['detection_time_start', 'detection_time_end']) {
      if (f in cleanedSegment) insertParamTypes[f] = 'TIME';
    }
    for (const f of ['media_id', 'delivery_media', 'extraction_dates']) {
      if (f in cleanedSegment && Array.isArray(cleanedSegment[f])) {
        insertParamTypes[f] = ['STRING'];
      }
    }

    await initializeBigQueryClient().query({
      query: insertQuery,
      params: cleanedSegment,
      ...(Object.keys(insertParamTypes).length > 0 ? { types: insertParamTypes } : {}),
      location: BQ_LOCATION,
    });
  } catch (err: any) {
    throw err;
  }
}

export async function updateSegment(segment_id: string, updates: any): Promise<void> {
  const currentProjectId = validateProjectId();

  // Step1: frontend field name → BQ column name mapping
  const rawUpdates: any = { ...updates };
  if ('request_confirmed' in rawUpdates) {
    rawUpdates.delivery_confirmed = rawUpdates.request_confirmed;
    delete rawUpdates.request_confirmed;
  }

  // Step2: allowlist filtering - only allow known segments columns to prevent BQ errors
  const segmentAllowedUpdateFields = new Set([
    'segment_name', 'segment_registered_at',
    'delivery_media', 'media_id',
    'poi_category', 'poi_type', 'attribute',
    'extraction_period', 'extraction_period_type',
    'extraction_start_date', 'extraction_end_date', 'extraction_dates',
    'detection_count', 'detection_time_start', 'detection_time_end',
    'stay_time', 'designated_radius',
    'location_request_status', 'data_link_status',
    'data_link_request_date', 'data_link_scheduled_date',
    'data_coordination_date', 'segment_expire_date',
    'delivery_confirmed', 'registerd_provider_segment',
    'ads_account_id', 'provider_segment_id',
  ]);

  const processedUpdates: any = {};
  for (const [key, value] of Object.entries(rawUpdates)) {
    if (segmentAllowedUpdateFields.has(key)) {
      processedUpdates[key] = value;
    }
  }

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

  const dateFields = [
    'extraction_start_date',
    'extraction_end_date',
    'data_link_request_date',
    'data_link_scheduled_date',
    'segment_expire_date',
    'data_coordination_date',
  ];
  for (const field of dateFields) {
    if (field in processedUpdates) {
      processedUpdates[field] = bqDate(processedUpdates[field]);
    }
  }

  const timeFields = ['detection_time_start', 'detection_time_end'];
  for (const field of timeFields) {
    if (field in processedUpdates) {
      processedUpdates[field] = bqTime(processedUpdates[field]);
    }
  }

  if (Object.keys(processedUpdates).length === 0) return;

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

  const paramTypes: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(allParams)) {
    if (Array.isArray(value)) {
      paramTypes[key] = ['STRING'];
    }
  }
  for (const field of dateFields) {
    if (field in allParams) paramTypes[field] = 'DATE';
  }
  for (const field of timeFields) {
    if (field in allParams) paramTypes[field] = 'TIME';
  }
  const stringFields = [
    'segment_name', 'attribute', 'extraction_period', 'extraction_period_type',
    'stay_time', 'designated_radius', 'poi_category', 'poi_type',
    'location_request_status', 'data_link_status', 'ads_account_id', 'provider_segment_id',
  ];
  for (const field of stringFields) {
    if (field in allParams) paramTypes[field] = 'STRING';
  }
  if ('detection_count' in allParams) paramTypes['detection_count'] = 'INT64';

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
