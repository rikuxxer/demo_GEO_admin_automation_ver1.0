import {
  validateProjectId,
  getCleanDatasetId,
  initializeBigQueryClient,
  BQ_LOCATION,
  datasetId,
  bqDate,
  bqTimestamp,
  getNextIdFromCounter,
} from './utils';

export async function generateNextProjectId(options?: { mode?: 'sequential' | 'timestamp' }): Promise<string> {
  try {
    const mode = options?.mode ?? 'sequential';
    if (mode === 'timestamp') {
      const fallbackId = `PRJ-${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;
      console.warn('⚠️ タイムスタンプ採番を使用:', fallbackId);
      return fallbackId;
    }

    const nextNumber = await getNextIdFromCounter('project_id');
    const newProjectId = `PRJ-${nextNumber}`;
    console.log('✅ 生成された案件ID:', newProjectId);
    return newProjectId;
  } catch (error: any) {
    console.error('❌ 案件ID生成エラー（連番・projects からの取得も失敗）:', error?.message || error);
    const fallbackId = `PRJ-${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
    console.warn('⚠️ フォールバックIDを使用（projects テーブルの確認や BigQuery 権限を確認してください）:', fallbackId);
    return fallbackId;
  }
}

export async function getProjects(): Promise<any[]> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();

    const query = `
      SELECT *
      FROM \`${currentProjectId}.${cleanDatasetId}.projects\`
      ORDER BY COALESCE(_register_datetime, created_at, updated_at) DESC
    `;

    console.log('🔍 BigQuery query config:', {
      projectId: currentProjectId,
      datasetId: cleanDatasetId,
      rawDatasetId: datasetId,
      location: BQ_LOCATION,
      locationType: typeof BQ_LOCATION,
      locationLength: BQ_LOCATION?.length,
      query: query.substring(0, 100) + '...',
    });

    const queryOptions: any = { query };

    if (BQ_LOCATION && BQ_LOCATION.trim()) {
      queryOptions.location = BQ_LOCATION.trim();
      console.log('✅ Location設定:', queryOptions.location);
    } else {
      console.error('❌ Locationが空です！');
      throw new Error('BigQuery location is not set');
    }

    console.log('📋 Query options:', JSON.stringify({
      query: query.substring(0, 50) + '...',
      location: queryOptions.location,
    }));

    const [rows] = await initializeBigQueryClient().query(queryOptions);
    console.log('✅ BigQuery query successful, rows:', rows.length);

    const formattedRows = rows.map((row: any) => {
      const formattedRow = { ...row };

      if (formattedRow.delivery_start_date) {
        if (formattedRow.delivery_start_date instanceof Date) {
          formattedRow.delivery_start_date = formattedRow.delivery_start_date.toISOString().split('T')[0];
        } else if (typeof formattedRow.delivery_start_date === 'string') {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedRow.delivery_start_date)) {
            const date = new Date(formattedRow.delivery_start_date);
            if (!isNaN(date.getTime())) {
              formattedRow.delivery_start_date = date.toISOString().split('T')[0];
            }
          }
        }
      }

      if (formattedRow.delivery_end_date) {
        if (formattedRow.delivery_end_date instanceof Date) {
          formattedRow.delivery_end_date = formattedRow.delivery_end_date.toISOString().split('T')[0];
        } else if (typeof formattedRow.delivery_end_date === 'string') {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedRow.delivery_end_date)) {
            const date = new Date(formattedRow.delivery_end_date);
            if (!isNaN(date.getTime())) {
              formattedRow.delivery_end_date = date.toISOString().split('T')[0];
            }
          }
        }
      }

      const timestampFields = ['project_registration_started_at', '_register_datetime', 'created_at', 'updated_at'];
      timestampFields.forEach(field => {
        if (formattedRow[field]) {
          if (formattedRow[field] instanceof Date) {
            formattedRow[field] = formattedRow[field].toISOString();
          } else if (typeof formattedRow[field] === 'string') {
            if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(formattedRow[field])) {
              const date = new Date(formattedRow[field]);
              if (!isNaN(date.getTime())) {
                formattedRow[field] = date.toISOString();
              }
            }
          } else if (typeof formattedRow[field] === 'object') {
            if ('value' in formattedRow[field]) {
              formattedRow[field] = String(formattedRow[field].value);
            } else {
              try {
                const date = new Date(formattedRow[field]);
                if (!isNaN(date.getTime())) {
                  formattedRow[field] = date.toISOString();
                }
              } catch (e) {
                console.warn(`⚠️ ${field}の変換エラー:`, formattedRow[field], e);
              }
            }
          }
        }
      });

      return formattedRow;
    });

    if (formattedRows.length > 0) {
      console.log('📅 最初のプロジェクトの日付フィールド:', {
        project_id: formattedRows[0].project_id,
        delivery_start_date: formattedRows[0].delivery_start_date,
        delivery_start_date_type: typeof formattedRows[0].delivery_start_date,
        delivery_end_date: formattedRows[0].delivery_end_date,
        delivery_end_date_type: typeof formattedRows[0].delivery_end_date,
        project_registration_started_at: formattedRows[0].project_registration_started_at,
        project_registration_started_at_type: typeof formattedRows[0].project_registration_started_at,
        _register_datetime: formattedRows[0]._register_datetime,
        _register_datetime_type: typeof formattedRows[0]._register_datetime,
      });
    }

    return formattedRows;
  } catch (error: any) {
    console.error('❌ BigQuery getProjects error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errors: error.errors,
      projectId: process.env.GCP_PROJECT_ID || 'NOT SET',
      datasetId: getCleanDatasetId(),
      rawDatasetId: datasetId,
      location: BQ_LOCATION,
    });

    let errorMessage = error.message || 'Unknown error';
    if (errorMessage.includes('universegeo-project')) {
      errorMessage = 'GCP_PROJECT_ID環境変数が設定されていません。Cloud Runの環境変数設定を確認してください。';
    }

    throw new Error(`BigQuery error: ${errorMessage}`);
  }
}

export async function getProjectById(project_id: string): Promise<any> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.projects\`
    WHERE project_id = @project_id
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    params: { project_id },
    location: BQ_LOCATION,
  });

  if (!rows || rows.length === 0) {
    return null;
  }

  const project = rows[0];

  if (project.delivery_start_date) {
    if (project.delivery_start_date instanceof Date) {
      project.delivery_start_date = project.delivery_start_date.toISOString().split('T')[0];
    } else if (typeof project.delivery_start_date === 'object') {
      if ('value' in project.delivery_start_date) {
        project.delivery_start_date = String(project.delivery_start_date.value);
      } else {
        try {
          const date = new Date(project.delivery_start_date);
          if (!isNaN(date.getTime())) {
            project.delivery_start_date = date.toISOString().split('T')[0];
          } else {
            console.warn('⚠️ delivery_start_dateの変換に失敗:', project.delivery_start_date);
            project.delivery_start_date = null;
          }
        } catch (e) {
          console.warn('⚠️ delivery_start_dateの変換エラー:', project.delivery_start_date, e);
          project.delivery_start_date = null;
        }
      }
    } else if (typeof project.delivery_start_date === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(project.delivery_start_date)) {
        const date = new Date(project.delivery_start_date);
        if (!isNaN(date.getTime())) {
          project.delivery_start_date = date.toISOString().split('T')[0];
        }
      }
    }
  }

  if (project.delivery_end_date) {
    if (project.delivery_end_date instanceof Date) {
      project.delivery_end_date = project.delivery_end_date.toISOString().split('T')[0];
    } else if (typeof project.delivery_end_date === 'object') {
      if ('value' in project.delivery_end_date) {
        project.delivery_end_date = String(project.delivery_end_date.value);
      } else {
        try {
          const date = new Date(project.delivery_end_date);
          if (!isNaN(date.getTime())) {
            project.delivery_end_date = date.toISOString().split('T')[0];
          } else {
            console.warn('⚠️ delivery_end_dateの変換に失敗:', project.delivery_end_date);
            project.delivery_end_date = null;
          }
        } catch (e) {
          console.warn('⚠️ delivery_end_dateの変換エラー:', project.delivery_end_date, e);
          project.delivery_end_date = null;
        }
      }
    } else if (typeof project.delivery_end_date === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(project.delivery_end_date)) {
        const date = new Date(project.delivery_end_date);
        if (!isNaN(date.getTime())) {
          project.delivery_end_date = date.toISOString().split('T')[0];
        }
      }
    }
  }

  return project;
}

export async function createProject(project: any): Promise<any> {
  try {
    const bq = initializeBigQueryClient();
    const currentProjectId = validateProjectId();

    if (!currentProjectId || currentProjectId.trim() === '') {
      const errorMsg = 'GCP_PROJECT_ID環境変数が設定されていません。Cloud Runの環境変数設定を確認してください。';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    const cleanDatasetId = getCleanDatasetId();

    console.log('📋 createProject config:', {
      projectId: currentProjectId,
      datasetId: cleanDatasetId,
      rawDatasetId: datasetId,
      clientProjectId: bq.projectId || 'NOT SET',
      location: BQ_LOCATION,
    });

    console.log('🔍 project_id検証開始:');
    console.log('  project.project_id:', project.project_id);
    console.log('  typeof project.project_id:', typeof project.project_id);
    console.log('  project.project_id?.trim():', project.project_id?.trim());
    console.log('  project keys:', Object.keys(project || {}));

    if (!project.project_id) {
      console.error('❌ project_idが存在しません');
      throw new Error('project_id is required and must be a non-empty string');
    }

    if (typeof project.project_id !== 'string') {
      console.error('❌ project_idが文字列ではありません:', typeof project.project_id);
      throw new Error('project_id is required and must be a non-empty string');
    }

    if (project.project_id.trim() === '') {
      console.error('❌ project_idが空文字列です');
      throw new Error('project_id is required and must be a non-empty string');
    }

    console.log('✅ project_id検証成功:', project.project_id);

    const allowedFields = [
      'project_id',
      'advertiser_name',
      'agency_name',
      'appeal_point',
      'delivery_start_date',
      'delivery_end_date',
      'person_in_charge',
      'project_status',
      'remarks',
      'project_registration_started_at',
      'universe_service_id',
      'universe_service_name',
      'sub_person_in_charge',
    ];

    const receivedFields = Object.keys(project || {});
    const excludedFields = receivedFields.filter(field => !allowedFields.includes(field));

    console.log('📋 フィールドフィルタリング:');
    console.log('  受信したフィールド:', receivedFields);
    console.log('  許可されたフィールド:', allowedFields);
    console.log('  除外されるフィールド:', excludedFields);
    if (excludedFields.length > 0) {
      console.warn('  ⚠️ 以下のフィールドはBigQueryスキーマに存在しないため除外されます:', excludedFields);
      excludedFields.forEach(field => {
        console.warn(`    - ${field}: ${JSON.stringify(project[field])}`);
      });
    }

    const cleanedProject: any = {
      project_id: project.project_id.trim(),
    };

    for (const field of allowedFields) {
      if (field in project && project[field] !== undefined) {
        if (field === 'delivery_start_date' || field === 'delivery_end_date') {
          const originalValue = project[field];
          const formattedDate = bqDate(originalValue);

          if (formattedDate !== null) {
            cleanedProject[field] = formattedDate;
            console.log(`✅ ${field}を保存:`, formattedDate);
          } else {
            if (originalValue === null || originalValue === '' || originalValue === undefined) {
              cleanedProject[field] = null;
              console.log(`📝 ${field}をnullとして保存（空文字列/null）`);
            } else {
              console.warn(`⚠️ 無効な日付形式のため、${field}をnullとして保存します:`, originalValue);
              cleanedProject[field] = null;
            }
          }
        } else {
          cleanedProject[field] = project[field];
        }
      }
    }

    console.log('✅ フィルタリング後のプロジェクトデータ:', {
      includedFields: Object.keys(cleanedProject),
      excludedFields: excludedFields,
    });

    const now = new Date();
    cleanedProject._register_datetime = bqTimestamp(project._register_datetime || now);
    cleanedProject.created_at = bqTimestamp(project.created_at || now);
    cleanedProject.updated_at = bqTimestamp(project.updated_at || now);

    console.log('📋 Cleaned project data for BigQuery:', {
      project_id: cleanedProject.project_id,
      delivery_start_date: cleanedProject.delivery_start_date,
      delivery_end_date: cleanedProject.delivery_end_date,
      _register_datetime: cleanedProject._register_datetime,
      created_at: cleanedProject.created_at,
      updated_at: cleanedProject.updated_at,
      allFields: Object.keys(cleanedProject),
    });

    const columns = Object.keys(cleanedProject);
    const insertQuery = `
      INSERT INTO \`${currentProjectId}.${cleanDatasetId}.projects\`
      (${columns.join(', ')})
      VALUES (${columns.map(c => `@${c}`).join(', ')})
    `;
    const insertParamTypes: Record<string, string | string[]> = {};
    for (const f of ['delivery_start_date', 'delivery_end_date']) {
      if (f in cleanedProject) insertParamTypes[f] = 'DATE';
    }
    for (const f of ['project_registration_started_at', '_register_datetime', 'created_at', 'updated_at']) {
      if (f in cleanedProject) insertParamTypes[f] = 'TIMESTAMP';
    }
    await bq.query({
      query: insertQuery,
      params: cleanedProject,
      ...(Object.keys(insertParamTypes).length > 0 ? { types: insertParamTypes } : {}),
      location: BQ_LOCATION,
    });

    return cleanedProject;
  } catch (error: any) {
    console.error('❌ BigQuery createProject error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      errors: error.errors,
      response: error.response,
      stack: error.stack,
      projectId: process.env.GCP_PROJECT_ID,
      datasetId: datasetId,
      location: BQ_LOCATION,
    });

    const enhancedError = new Error(error.message || 'プロジェクトの作成に失敗しました');
    enhancedError.name = error.name || 'BigQueryError';

    (enhancedError as any).code = error.code;
    (enhancedError as any).errors = error.errors;
    (enhancedError as any).response = error.response;
    (enhancedError as any).cause = error;

    if (error.message) {
      if (error.message.includes('Not found: Project')) {
        (enhancedError as any).hint = 'GCP_PROJECT_ID環境変数が正しく設定されていないか、プロジェクトが見つかりません。Cloud Runの環境変数設定を確認してください。';
      } else if (error.message.includes('Permission denied')) {
        (enhancedError as any).hint = 'BigQueryへの書き込み権限がありません。Cloud Runサービスアカウントの権限を確認してください。';
      } else if (error.message.includes('project_id is required')) {
        (enhancedError as any).hint = 'project_idは必須です。リクエストにproject_idが含まれているか確認してください。';
      }
    }

    enhancedError.stack = error.stack || enhancedError.stack;

    throw enhancedError;
  }
}

export async function updateProject(project_id: string, updates: any): Promise<void> {
  const currentProjectId = validateProjectId();

  const processedUpdates = { ...updates };
  const dateFields = ['delivery_start_date', 'delivery_end_date'];
  for (const field of dateFields) {
    if (field in processedUpdates) {
      processedUpdates[field] = bqDate(processedUpdates[field]);
    }
  }

  if (Object.keys(processedUpdates).length === 0) return;

  const setClause = Object.keys(processedUpdates)
    .map(key => `${key} = @${key}`)
    .join(', ');

  const cleanDatasetId = getCleanDatasetId();
  const query = `
    UPDATE \`${currentProjectId}.${cleanDatasetId}.projects\`
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
    WHERE project_id = @project_id
  `;

  const allParams = { project_id, ...processedUpdates };
  const paramTypes: Record<string, string | string[]> = {};
  for (const field of dateFields) {
    if (field in allParams) paramTypes[field] = 'DATE';
  }
  const stringFields = [
    'project_name', 'advertiser_name', 'agency_name', 'appeal_point',
    'person_in_charge', 'remarks', 'universe_service_id', 'universe_service_name',
    'sub_person_in_charge', 'project_status',
  ];
  for (const field of stringFields) {
    if (field in allParams) paramTypes[field] = 'STRING';
  }

  await initializeBigQueryClient().query({
    query,
    params: allParams,
    ...(Object.keys(paramTypes).length > 0 ? { types: paramTypes } : {}),
    location: BQ_LOCATION,
  });
}

export async function deleteProject(project_id: string): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    DELETE FROM \`${currentProjectId}.${cleanDatasetId}.projects\`
    WHERE project_id = @project_id
  `;
  await initializeBigQueryClient().query({
    query,
    params: { project_id },
    location: BQ_LOCATION,
  });
}
