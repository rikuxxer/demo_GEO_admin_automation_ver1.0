import {
  validateProjectId,
  getCleanDatasetId,
  initializeBigQueryClient,
  BQ_LOCATION,
  getDataset,
  formatTimestampForBigQuery,
  formatBoolForBigQuery,
  formatDateForBigQuery,
  formatTimeForBigQuery,
} from './utils';

// ==================== メッセージ ====================

export async function getMessages(project_id: string): Promise<any[]> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.messages\`
    WHERE project_id = @project_id
    ORDER BY timestamp DESC
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    params: { project_id },
    location: BQ_LOCATION,
  });
  return rows;
}

export async function getAllMessages(): Promise<any[]> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.messages\`
    ORDER BY timestamp DESC
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    location: BQ_LOCATION,
  });
  return rows;
}

export async function createMessage(message: any): Promise<void> {
  try {
    if (!message.message_id || typeof message.message_id !== 'string' || message.message_id.trim() === '') {
      throw new Error('message_id is required and must be a non-empty string');
    }
    if (!message.project_id || typeof message.project_id !== 'string' || message.project_id.trim() === '') {
      throw new Error('project_id is required and must be a non-empty string');
    }
    if (!message.sender_id || typeof message.sender_id !== 'string' || message.sender_id.trim() === '') {
      throw new Error('sender_id is required and must be a non-empty string');
    }
    if (!message.sender_name || typeof message.sender_name !== 'string' || message.sender_name.trim() === '') {
      throw new Error('sender_name is required and must be a non-empty string');
    }
    if (!message.sender_role || typeof message.sender_role !== 'string' || message.sender_role.trim() === '') {
      throw new Error('sender_role is required and must be a non-empty string');
    }
    if (!message.content || typeof message.content !== 'string' || message.content.trim() === '') {
      throw new Error('content is required and must be a non-empty string');
    }

    const allowedFields = [
      'message_id',
      'project_id',
      'sender_id',
      'sender_name',
      'sender_role',
      'content',
      'message_type',
      'is_read',
      'timestamp',
    ];

    const cleanedMessage: any = {
      message_id: message.message_id.trim(),
      project_id: message.project_id.trim(),
      sender_id: message.sender_id.trim(),
      sender_name: message.sender_name.trim(),
      sender_role: message.sender_role.trim(),
      content: message.content.trim(),
    };

    for (const field of allowedFields) {
      if (field in message && message[field] !== undefined && message[field] !== null) {
        if (field === 'is_read') {
          cleanedMessage[field] = formatBoolForBigQuery(message[field]);
        } else if (field === 'timestamp') {
          cleanedMessage[field] = formatTimestampForBigQuery(message[field] || new Date());
        } else {
          cleanedMessage[field] = message[field];
        }
      }
    }

    if (!cleanedMessage.is_read) {
      cleanedMessage.is_read = formatBoolForBigQuery(false);
    }
    if (!cleanedMessage.timestamp) {
      cleanedMessage.timestamp = formatTimestampForBigQuery(new Date());
    }

    console.log('📋 Cleaned message data for BigQuery:', {
      message_id: cleanedMessage.message_id,
      project_id: cleanedMessage.project_id,
      sender_id: cleanedMessage.sender_id,
      allFields: Object.keys(cleanedMessage),
    });

    await getDataset().table('messages').insert([cleanedMessage], { ignoreUnknownValues: true });
  } catch (err: any) {
    console.error('[BQ insert messages] message:', err?.message);
    console.error('[BQ insert messages] errors:', JSON.stringify(err?.errors, null, 2));

    if (err.errors && Array.isArray(err.errors)) {
      err.errors.forEach((error: any, index: number) => {
        console.error(`[BQ insert messages] error[${index}]:`, {
          message: error.message,
          reason: error.reason,
          location: error.location,
        });
      });
    }

    throw err;
  }
}

export async function markMessagesAsRead(message_ids: string[]): Promise<void> {
  if (message_ids.length === 0) return;

  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const placeholders = message_ids.map((_, i) => `@message_id_${i}`).join(', ');
  const query = `
    UPDATE \`${currentProjectId}.${cleanDatasetId}.messages\`
    SET is_read = TRUE
    WHERE message_id IN (${placeholders})
  `;

  const params: any = {};
  message_ids.forEach((id, i) => {
    params[`message_id_${i}`] = id;
  });

  await initializeBigQueryClient().query({
    query,
    params,
    location: BQ_LOCATION,
  });
}

// ==================== 編集依頼 (edit_requests) ====================

export async function getEditRequests(): Promise<any[]> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const [rows] = await initializeBigQueryClient().query({
      query: `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.edit_requests\` ORDER BY requested_at DESC`,
      location: BQ_LOCATION,
    });
    return (rows || []).map((r: any) => ({
      ...r,
      changes: r.changes ? (typeof r.changes === 'string' ? JSON.parse(r.changes) : r.changes) : {},
    }));
  } catch (err: any) {
    if (err?.message?.includes('Not found') || err?.code === 404) return [];
    console.error('[BQ getEditRequests]', err?.message);
    throw err;
  }
}

export async function createEditRequest(row: any): Promise<void> {
  const changesStr = row.changes ? (typeof row.changes === 'string' ? row.changes : JSON.stringify(row.changes)) : null;
  const cleaned: any = {
    request_id: String(row.request_id).trim(),
    request_type: String(row.request_type).trim(),
    target_id: String(row.target_id).trim(),
    project_id: String(row.project_id).trim(),
    requested_by: String(row.requested_by).trim(),
    requested_at: formatTimestampForBigQuery(row.requested_at || new Date()),
    request_reason: String(row.request_reason ?? '').trim(),
    status: String(row.status ?? 'pending').trim(),
    changes: changesStr,
    segment_id: row.segment_id != null ? String(row.segment_id).trim() : null,
    reviewed_by: row.reviewed_by != null ? String(row.reviewed_by).trim() : null,
    reviewed_at: row.reviewed_at ? formatTimestampForBigQuery(row.reviewed_at) : null,
    review_comment: row.review_comment != null ? String(row.review_comment).trim() : null,
  };
  await getDataset().table('edit_requests').insert([cleaned], { ignoreUnknownValues: true });
}

export async function updateEditRequest(request_id: string, updates: any): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const setParts: string[] = [];
  const params: any = { request_id: request_id.trim() };
  if (updates.status != null) { setParts.push('status = @status'); params.status = String(updates.status).trim(); }
  if (updates.reviewed_by != null) { setParts.push('reviewed_by = @reviewed_by'); params.reviewed_by = String(updates.reviewed_by).trim(); }
  if (updates.reviewed_at != null) { setParts.push('reviewed_at = @reviewed_at'); params.reviewed_at = formatTimestampForBigQuery(updates.reviewed_at); }
  if (updates.review_comment != null) { setParts.push('review_comment = @review_comment'); params.review_comment = String(updates.review_comment).trim(); }
  if (updates.changes != null) { setParts.push('changes = @changes'); params.changes = typeof updates.changes === 'string' ? updates.changes : JSON.stringify(updates.changes); }
  if (setParts.length === 0) return;
  const query = `UPDATE \`${currentProjectId}.${cleanDatasetId}.edit_requests\` SET ${setParts.join(', ')} WHERE request_id = @request_id`;

  const paramTypes: Record<string, string> = {};
  if ('reviewed_at' in params) paramTypes.reviewed_at = 'TIMESTAMP';

  await initializeBigQueryClient().query({
    query,
    params,
    ...(Object.keys(paramTypes).length > 0 ? { types: paramTypes } : {}),
    location: BQ_LOCATION,
  });
}

export async function deleteEditRequest(request_id: string): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  await initializeBigQueryClient().query({
    query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.edit_requests\` WHERE request_id = @request_id`,
    params: { request_id: request_id.trim() },
    location: BQ_LOCATION,
  });
}

// ==================== 来店計測地点グループ (visit_measurement_groups) ====================

export async function getVisitMeasurementGroups(project_id: string): Promise<any[]> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const [rows] = await initializeBigQueryClient().query({
      query: `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.visit_measurement_groups\` WHERE project_id = @project_id ORDER BY created DESC`,
      params: { project_id: project_id.trim() },
      location: BQ_LOCATION,
    });
    return rows || [];
  } catch (err: any) {
    if (err?.message?.includes('Not found') || err?.code === 404) return [];
    console.error('[BQ getVisitMeasurementGroups]', err?.message);
    throw err;
  }
}

export async function createVisitMeasurementGroup(row: any): Promise<void> {
  const now = new Date();
  const cleaned: any = {
    project_id: String(row.project_id).trim(),
    group_id: String(row.group_id).trim(),
    group_name: String(row.group_name ?? '').trim(),
    attribute: row.attribute != null ? String(row.attribute).trim() : null,
    extraction_period: row.extraction_period != null ? String(row.extraction_period).trim() : null,
    extraction_period_type: row.extraction_period_type != null ? String(row.extraction_period_type).trim() : null,
    extraction_start_date: row.extraction_start_date ? formatDateForBigQuery(row.extraction_start_date) : null,
    extraction_end_date: row.extraction_end_date ? formatDateForBigQuery(row.extraction_end_date) : null,
    extraction_dates: Array.isArray(row.extraction_dates) ? row.extraction_dates : null,
    detection_count: row.detection_count != null ? (typeof row.detection_count === 'number' ? row.detection_count : parseInt(String(row.detection_count), 10)) : null,
    detection_time_start: row.detection_time_start ? formatTimeForBigQuery(row.detection_time_start) : null,
    detection_time_end: row.detection_time_end ? formatTimeForBigQuery(row.detection_time_end) : null,
    stay_time: row.stay_time != null ? String(row.stay_time).trim() : null,
    designated_radius: row.designated_radius != null ? String(row.designated_radius).trim() : null,
    created: formatTimestampForBigQuery(row.created || now),
    updated_at: formatTimestampForBigQuery(row.updated_at || now),
  };
  await getDataset().table('visit_measurement_groups').insert([cleaned], { ignoreUnknownValues: true });
}

export async function updateVisitMeasurementGroup(group_id: string, updates: any): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const allowed = ['group_name', 'attribute', 'extraction_period', 'extraction_period_type', 'extraction_start_date', 'extraction_end_date', 'extraction_dates', 'detection_count', 'detection_time_start', 'detection_time_end', 'stay_time', 'designated_radius'];
  const setClause = allowed.filter(f => updates[f] !== undefined).map(f => `${f} = @${f}`).join(', ');
  if (!setClause) return;
  const params: any = { group_id: group_id.trim() };
  allowed.forEach(f => { if (updates[f] !== undefined) params[f] = f === 'extraction_start_date' || f === 'extraction_end_date' ? formatDateForBigQuery(updates[f]) : f === 'detection_time_start' || f === 'detection_time_end' ? formatTimeForBigQuery(updates[f]) : f === 'extraction_dates' ? updates[f] : updates[f]; });
  params.updated_at = formatTimestampForBigQuery(new Date());
  const query = `UPDATE \`${currentProjectId}.${cleanDatasetId}.visit_measurement_groups\` SET ${setClause}, updated_at = @updated_at WHERE group_id = @group_id`;

  const paramTypes: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      paramTypes[key] = ['STRING'];
    }
  }
  if ('extraction_start_date' in params) paramTypes.extraction_start_date = 'DATE';
  if ('extraction_end_date' in params) paramTypes.extraction_end_date = 'DATE';
  if ('detection_time_start' in params) paramTypes.detection_time_start = 'TIME';
  if ('detection_time_end' in params) paramTypes.detection_time_end = 'TIME';

  await initializeBigQueryClient().query({
    query,
    params,
    ...(Object.keys(paramTypes).length > 0 ? { types: paramTypes } : {}),
    location: BQ_LOCATION,
  });
}

export async function deleteVisitMeasurementGroup(group_id: string): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  await initializeBigQueryClient().query({
    query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.visit_measurement_groups\` WHERE group_id = @group_id`,
    params: { group_id: group_id.trim() },
    location: BQ_LOCATION,
  });
}

// ==================== 機能リクエスト (feature_requests) ====================

export async function getFeatureRequests(): Promise<any[]> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const [rows] = await initializeBigQueryClient().query({
      query: `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.feature_requests\` ORDER BY requested_at DESC`,
      location: BQ_LOCATION,
    });
    return rows || [];
  } catch (err: any) {
    if (err?.message?.includes('Not found') || err?.code === 404) return [];
    console.error('[BQ getFeatureRequests]', err?.message);
    throw err;
  }
}

export async function createFeatureRequest(row: any): Promise<void> {
  const now = new Date();
  const cleaned: any = {
    request_id: String(row.request_id).trim(),
    requested_by: String(row.requested_by).trim(),
    requested_by_name: String(row.requested_by_name ?? '').trim(),
    requested_at: formatTimestampForBigQuery(row.requested_at || now),
    title: String(row.title ?? '').trim(),
    description: String(row.description ?? '').trim(),
    category: String(row.category ?? 'other').trim(),
    priority: String(row.priority ?? 'medium').trim(),
    status: String(row.status ?? 'pending').trim(),
    reviewed_by: row.reviewed_by != null ? String(row.reviewed_by).trim() : null,
    reviewed_at: row.reviewed_at ? formatTimestampForBigQuery(row.reviewed_at) : null,
    review_comment: row.review_comment != null ? String(row.review_comment).trim() : null,
    implemented_at: row.implemented_at ? formatTimestampForBigQuery(row.implemented_at) : null,
  };
  await getDataset().table('feature_requests').insert([cleaned], { ignoreUnknownValues: true });
}

export async function updateFeatureRequest(request_id: string, updates: any): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const allowed = ['title', 'description', 'category', 'priority', 'status', 'reviewed_by', 'reviewed_at', 'review_comment', 'implemented_at'];
  const setParts: string[] = [];
  const params: any = { request_id: request_id.trim() };
  allowed.forEach(f => {
    if (updates[f] !== undefined) {
      setParts.push(`${f} = @${f}`);
      params[f] = f === 'reviewed_at' || f === 'implemented_at' ? formatTimestampForBigQuery(updates[f]) : updates[f];
    }
  });
  if (setParts.length === 0) return;
  const query = `UPDATE \`${currentProjectId}.${cleanDatasetId}.feature_requests\` SET ${setParts.join(', ')} WHERE request_id = @request_id`;
  await initializeBigQueryClient().query({ query, params, location: BQ_LOCATION });
}

// ==================== レポート作成依頼 (report_requests) ====================

export async function getReportRequests(project_id?: string, status?: string): Promise<any[]> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    let query = `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.report_requests\` WHERE 1=1`;
    const params: any = {};

    if (project_id && project_id.trim()) {
      query += ` AND project_id = @project_id`;
      params.project_id = project_id.trim();
    }

    if (status && status.trim()) {
      query += ` AND status = @status`;
      params.status = status.trim();
    }

    query += ` ORDER BY requested_at DESC`;

    const [rows] = await initializeBigQueryClient().query({
      query,
      params: Object.keys(params).length ? params : undefined,
      location: BQ_LOCATION,
    });

    return (rows || []).map((r: any) => ({
      ...r,
      segment_ids: r.segment_ids ? (typeof r.segment_ids === 'string' ? JSON.parse(r.segment_ids) : r.segment_ids) : [],
    }));
  } catch (err: any) {
    if (err?.message?.includes('Not found') || err?.code === 404) return [];
    console.error('[BQ getReportRequests]', err?.message);
    throw err;
  }
}

export async function getReportRequestById(request_id: string): Promise<any | null> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const [rows] = await initializeBigQueryClient().query({
      query: `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.report_requests\` WHERE request_id = @request_id`,
      params: { request_id: request_id.trim() },
      location: BQ_LOCATION,
    });
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      segment_ids: r.segment_ids ? (typeof r.segment_ids === 'string' ? JSON.parse(r.segment_ids) : r.segment_ids) : [],
    };
  } catch (err: any) {
    if (err?.message?.includes('Not found') || err?.code === 404) return null;
    console.error('[BQ getReportRequestById]', err?.message);
    throw err;
  }
}

export async function createReportRequest(row: any): Promise<void> {
  const now = new Date();
  const cleaned: any = {
    request_id: String(row.request_id).trim(),
    requested_by: String(row.requested_by).trim(),
    requested_by_name: String(row.requested_by_name ?? '').trim(),
    requested_at: formatTimestampForBigQuery(row.requested_at || now),
    project_id: String(row.project_id).trim(),
    report_type: String(row.report_type ?? 'custom').trim(),
    report_title: String(row.report_title ?? '').trim(),
    description: row.description != null ? String(row.description).trim() : null,
    start_date: row.start_date ? formatDateForBigQuery(row.start_date) : null,
    end_date: row.end_date ? formatDateForBigQuery(row.end_date) : null,
    segment_ids: row.segment_ids && Array.isArray(row.segment_ids) ? JSON.stringify(row.segment_ids) : null,
    status: String(row.status ?? 'pending').trim(),
    reviewed_by: row.reviewed_by != null ? String(row.reviewed_by).trim() : null,
    reviewed_at: row.reviewed_at ? formatTimestampForBigQuery(row.reviewed_at) : null,
    review_comment: row.review_comment != null ? String(row.review_comment).trim() : null,
    report_url: row.report_url != null ? String(row.report_url).trim() : null,
    completed_at: row.completed_at ? formatTimestampForBigQuery(row.completed_at) : null,
    error_message: row.error_message != null ? String(row.error_message).trim() : null,
  };
  await getDataset().table('report_requests').insert([cleaned], { ignoreUnknownValues: true });
}

export async function updateReportRequest(request_id: string, updates: any): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const allowed = [
    'report_title', 'description', 'report_type', 'start_date', 'end_date', 'segment_ids',
    'status', 'reviewed_by', 'reviewed_at', 'review_comment', 'report_url', 'completed_at', 'error_message'
  ];
  const setParts: string[] = [];
  const params: any = { request_id: request_id.trim() };

  allowed.forEach(f => {
    if (updates[f] !== undefined) {
      if (f === 'start_date' || f === 'end_date') {
        setParts.push(`${f} = @${f}`);
        params[f] = formatDateForBigQuery(updates[f]);
      } else if (f === 'segment_ids' && Array.isArray(updates[f])) {
        setParts.push(`${f} = @${f}`);
        params[f] = JSON.stringify(updates[f]);
      } else if (f === 'reviewed_at' || f === 'completed_at') {
        setParts.push(`${f} = @${f}`);
        params[f] = formatTimestampForBigQuery(updates[f]);
      } else {
        setParts.push(`${f} = @${f}`);
        params[f] = updates[f];
      }
    }
  });

  if (setParts.length === 0) return;

  const query = `UPDATE \`${currentProjectId}.${cleanDatasetId}.report_requests\` SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP() WHERE request_id = @request_id`;

  const paramTypes: Record<string, string | string[]> = {};
  if ('start_date' in params) paramTypes.start_date = 'DATE';
  if ('end_date' in params) paramTypes.end_date = 'DATE';
  if ('reviewed_at' in params) paramTypes.reviewed_at = 'TIMESTAMP';
  if ('completed_at' in params) paramTypes.completed_at = 'TIMESTAMP';

  await initializeBigQueryClient().query({
    query,
    params,
    ...(Object.keys(paramTypes).length > 0 ? { types: paramTypes } : {}),
    location: BQ_LOCATION,
  });
}

// ==================== 変更履歴 (change_history) ====================

export async function getChangeHistories(project_id?: string): Promise<any[]> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    let query = `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.change_history\` ORDER BY changed_at DESC`;
    const params: any = {};
    if (project_id && project_id.trim()) {
      query = `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.change_history\` WHERE project_id = @project_id ORDER BY changed_at DESC`;
      params.project_id = project_id.trim();
    }
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: Object.keys(params).length ? params : undefined,
      location: BQ_LOCATION,
    });
    return (rows || []).map((r: any) => ({
      ...r,
      changes: r.changes ? (typeof r.changes === 'string' ? JSON.parse(r.changes) : r.changes) : undefined,
      deleted_data: r.deleted_data ? (typeof r.deleted_data === 'string' ? JSON.parse(r.deleted_data) : r.deleted_data) : undefined,
    }));
  } catch (err: any) {
    if (err?.message?.includes('Not found') || err?.code === 404) return [];
    console.error('[BQ getChangeHistories]', err?.message);
    throw err;
  }
}

export async function insertChangeHistory(row: any): Promise<void> {
  const cleaned: any = {
    history_id: String(row.history_id).trim(),
    entity_type: String(row.entity_type).trim(),
    entity_id: String(row.entity_id).trim(),
    project_id: String(row.project_id).trim(),
    segment_id: row.segment_id != null ? String(row.segment_id).trim() : null,
    action: String(row.action).trim(),
    changed_by: String(row.changed_by).trim(),
    changed_at: formatTimestampForBigQuery(row.changed_at || new Date()),
    changes: row.changes ? (typeof row.changes === 'string' ? row.changes : JSON.stringify(row.changes)) : null,
    deleted_data: row.deleted_data ? (typeof row.deleted_data === 'string' ? row.deleted_data : JSON.stringify(row.deleted_data)) : null,
  };
  await getDataset().table('change_history').insert([cleaned], { ignoreUnknownValues: true });
}
