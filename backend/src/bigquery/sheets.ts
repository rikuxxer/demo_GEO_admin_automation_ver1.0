import {
  validateProjectId,
  getCleanDatasetId,
  initializeBigQueryClient,
  BQ_LOCATION,
  getDataset,
  formatTimestampForBigQuery,
  sleep,
} from './utils';

export async function exportToGoogleSheets(rows: any[]): Promise<{
  success: boolean;
  message: string;
  rowsAdded?: number;
}> {
  const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
  const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'シート1';

  if (!SPREADSHEET_ID) {
    return {
      success: false,
      message: 'Google Sheets API が設定されていません。環境変数（GOOGLE_SPREADSHEET_ID）を確認してください。',
    };
  }

  try {
    const values = rows.map(row => {
      let createdValue = row.created || '';
      if (createdValue && !createdValue.includes('/')) {
        createdValue = createdValue.replace(/-/g, '/');
      }
      if (!createdValue) {
        const now = new Date();
        createdValue = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
      }

      return [
        row.category_id || '',
        row.brand_id || '',
        row.brand_name || '',
        row.poi_id || '',
        row.poi_name || '',
        row.latitude !== undefined && row.latitude !== null ? String(row.latitude) : '',
        row.longitude !== undefined && row.longitude !== null ? String(row.longitude) : '',
        row.prefecture || '',
        row.city || '',
        row.radius || '',
        row.polygon || '',
        row.setting_flag || '2',
        createdValue,
      ];
    });

    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    const projectId = await auth.getProjectId();
    let serviceAccountEmail = 'unknown';

    if (authClient && 'email' in authClient) {
      serviceAccountEmail = (authClient as any).email || 'unknown';
    } else if (authClient && 'credentials' in authClient) {
      const credentials = (authClient as any).credentials;
      if (credentials && credentials.client_email) {
        serviceAccountEmail = credentials.client_email;
      }
    }

    console.log('🔐 Google Sheets API認証情報:', {
      projectId,
      serviceAccountEmail,
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const CHUNK_SIZE = 50;
    let totalRowsAdded = 0;
    const chunkErrors: string[] = [];

    for (let i = 0; i < values.length; i += CHUNK_SIZE) {
      const chunk = values.slice(i, i + CHUNK_SIZE);
      try {
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:M`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: chunk },
        });
        totalRowsAdded += response.data.updates?.updatedRows || chunk.length;
      } catch (chunkErr: any) {
        chunkErrors.push(`chunk[${i}..${i + chunk.length - 1}]: ${chunkErr?.message}`);
      }
      if (i + CHUNK_SIZE < values.length) {
        await sleep(200);
      }
    }

    if (chunkErrors.length > 0 && totalRowsAdded === 0) {
      throw new Error(chunkErrors.join('; '));
    }

    return {
      success: true,
      message: `${totalRowsAdded}件のデータをスプレッドシートに追加しました`,
      rowsAdded: totalRowsAdded,
    };
  } catch (error: any) {
    console.error('❌ Google Sheets API エラー:', error);

    const errorDetails: any = {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
    };

    if (error?.response?.data) {
      errorDetails.responseData = error.response.data;
      console.error('📋 Google API エラー詳細 (response.data):', JSON.stringify(error.response.data, null, 2));
    }

    console.error('📋 エラー詳細:', errorDetails);

    if (error?.stack) {
      console.error('📋 スタックトレース:', error.stack);
    }

    let errorMessage = 'スプレッドシートへの出力に失敗しました';
    let detailedMessage = '';

    if (error instanceof Error) {
      errorMessage = error.message;

      if (error.message.includes('PERMISSION_DENIED') ||
          error.message.includes('403') ||
          error.message.includes('does not have permission') ||
          error.message.includes('The caller does not have permission')) {
        errorMessage = 'スプレッドシートへのアクセス権限がありません。';
        detailedMessage = `
以下の手順でサービスアカウントにスプレッドシートへの共有権限を付与してください：

1. Googleスプレッドシートを開く
2. 右上の「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを入力（バックエンドのログで確認できます）
4. 権限を「編集者」に設定
5. 「送信」をクリック

サービスアカウントの確認方法:
- Cloud Runの設定から確認
- または、バックエンドのログで「Google Sheets API認証情報」を確認
        `.trim();
      } else if (error.message.includes('NOT_FOUND') || error.message.includes('404')) {
        errorMessage = 'スプレッドシートが見つかりません。';
        detailedMessage = 'スプレッドシートID（GOOGLE_SPREADSHEET_ID）が正しいか確認してください。';
      } else if (error.message.includes('UNAUTHENTICATED') || error.message.includes('401')) {
        errorMessage = '認証に失敗しました。';
        detailedMessage = 'サービスアカウントの権限を確認してください。';
      }
    }

    return {
      success: false,
      message: errorMessage + (detailedMessage ? '\n\n' + detailedMessage : ''),
    };
  }
}

export async function exportToGoogleSheetsWithAccumulation(
  rows: any[],
  projectId: string,
  segmentId?: string,
  exportedBy?: string,
  exportedByName?: string,
  deferExport: boolean = false
): Promise<{
  success: boolean;
  message: string;
  exportId?: string;
  rowsAdded?: number;
}> {
  const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
  const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'シート1';

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const randomNum = String(Math.floor(Math.random() * 10000)).padStart(3, '0');
  const exportId = `EXP-${dateStr}-${randomNum}`;

  const exportDataRecords = rows.map((row, index) => ({
    export_data_id: `${exportId}-${String(index + 1).padStart(3, '0')}`,
    export_id: exportId,
    project_id: projectId,
    segment_id: segmentId || null,
    poi_id: row.poi_id || null,
    category_id: row.category_id || null,
    brand_id: row.brand_id || null,
    brand_name: row.brand_name || null,
    poi_name: row.poi_name || null,
    latitude: row.latitude || null,
    longitude: row.longitude || null,
    prefecture: row.prefecture || null,
    city: row.city || null,
    radius: row.radius || null,
    polygon: row.polygon || null,
    setting_flag: row.setting_flag || '2',
    created: row.created || null,
    row_index: index + 1,
  }));

  if (deferExport) {
    try {
      const exportRecord = {
        export_id: exportId,
        project_id: projectId,
        segment_id: segmentId || null,
        exported_by: exportedBy || 'system',
        exported_by_name: exportedByName || 'システム',
        export_status: 'pending',
        spreadsheet_id: SPREADSHEET_ID,
        sheet_name: SHEET_NAME,
        row_count: rows.length,
        exported_at: now.toISOString(),
        completed_at: null,
        error_message: null,
      };
      await createSheetExport(exportRecord);
      await createSheetExportDataBulk(exportDataRecords);
      return {
        success: true,
        message: `エクスポートをキューに登録しました（エクスポートID: ${exportId}）`,
        exportId,
        rowsAdded: 0,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `キュー登録中にエラーが発生しました。エラー: ${error?.message || 'Unknown error'}`,
        exportId,
      };
    }
  }

  const exportResult = await exportToGoogleSheets(rows);
  const finalStatus = exportResult.success ? 'completed' : 'failed';

  try {
    const exportRecord = {
      export_id: exportId,
      project_id: projectId,
      segment_id: segmentId || null,
      exported_by: exportedBy || 'system',
      exported_by_name: exportedByName || 'システム',
      export_status: finalStatus,
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: SHEET_NAME,
      row_count: rows.length,
      exported_at: now.toISOString(),
      completed_at: exportResult.success ? new Date().toISOString() : null,
      error_message: exportResult.success ? null : exportResult.message,
    };
    await createSheetExport(exportRecord);
    await createSheetExportDataBulk(exportDataRecords);
  } catch (dbError: any) {
    console.error('[BQ save after export] error:', dbError?.message);
  }

  if (exportResult.success) {
    return {
      success: true,
      message: `${exportResult.rowsAdded || rows.length}件のデータをスプレッドシートに追加しました（エクスポートID: ${exportId}）`,
      exportId,
      rowsAdded: exportResult.rowsAdded || rows.length,
    };
  } else {
    return {
      success: false,
      message: `スプレッドシートへの書き出しに失敗しました。エラー: ${exportResult.message}`,
      exportId,
    };
  }
}

export async function createSheetExport(exportRecord: any): Promise<void> {
  try {
    const allowedFields = [
      'export_id',
      'project_id',
      'segment_id',
      'exported_by',
      'exported_by_name',
      'export_status',
      'spreadsheet_id',
      'sheet_name',
      'row_count',
      'exported_at',
      'completed_at',
      'error_message',
    ];

    const cleanedExport: any = {
      export_id: exportRecord.export_id.trim(),
    };

    for (const field of allowedFields) {
      if (field in exportRecord && exportRecord[field] !== undefined && exportRecord[field] !== null) {
        if (field === 'exported_at' || field === 'completed_at') {
          cleanedExport[field] = formatTimestampForBigQuery(exportRecord[field]);
        } else if (field === 'row_count') {
          const numValue = typeof exportRecord[field] === 'string' ? parseInt(exportRecord[field]) : exportRecord[field];
          if (!isNaN(numValue)) {
            cleanedExport[field] = numValue;
          }
        } else {
          cleanedExport[field] = exportRecord[field];
        }
      }
    }

    const now = new Date();
    cleanedExport.created_at = formatTimestampForBigQuery(exportRecord.created_at || now);
    cleanedExport.updated_at = formatTimestampForBigQuery(exportRecord.updated_at || now);

    await getDataset().table('sheet_exports').insert([cleanedExport], { ignoreUnknownValues: true });
    console.log('✅ エクスポート履歴を作成しました:', exportRecord.export_id);
  } catch (err: any) {
    console.error('[BQ insert sheet_export] error:', err?.message);
    throw err;
  }
}

export async function createSheetExportDataBulk(exportData: any[]): Promise<void> {
  try {
    const allowedFields = [
      'export_data_id',
      'export_id',
      'project_id',
      'segment_id',
      'poi_id',
      'category_id',
      'brand_id',
      'brand_name',
      'poi_name',
      'latitude',
      'longitude',
      'prefecture',
      'city',
      'radius',
      'polygon',
      'setting_flag',
      'created',
      'row_index',
    ];

    const cleanedData = exportData.map(data => {
      const cleaned: any = {
        export_data_id: data.export_data_id.trim(),
        export_id: data.export_id.trim(),
        project_id: data.project_id.trim(),
      };

      for (const field of allowedFields) {
        if (field in data && data[field] !== undefined && data[field] !== null) {
          if (field === 'latitude' || field === 'longitude') {
            const numValue = typeof data[field] === 'string' ? parseFloat(data[field]) : data[field];
            if (!isNaN(numValue)) {
              cleaned[field] = numValue;
            }
          } else if (field === 'row_index') {
            const numValue = typeof data[field] === 'string' ? parseInt(data[field]) : data[field];
            if (!isNaN(numValue)) {
              cleaned[field] = numValue;
            }
          } else {
            cleaned[field] = data[field];
          }
        }
      }

      const now = new Date();
      cleaned.created_at = formatTimestampForBigQuery(data.created_at || now);

      return cleaned;
    });

    await getDataset().table('sheet_export_data').insert(cleanedData, { ignoreUnknownValues: true });
    console.log(`✅ エクスポートデータを一括作成しました: ${cleanedData.length}件`);
  } catch (err: any) {
    console.error('[BQ insert sheet_export_data bulk] error:', err?.message);
    throw err;
  }
}

export async function updateSheetExportStatus(
  exportId: string,
  status: 'pending' | 'completed' | 'failed',
  errorMessage?: string | null
): Promise<void> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();

    const updateFields: string[] = ['export_status', 'updated_at'];
    const updateValues: any = {
      export_status: status,
      updated_at: formatTimestampForBigQuery(new Date()),
    };

    if (status === 'completed') {
      updateFields.push('completed_at');
      updateValues.completed_at = formatTimestampForBigQuery(new Date());
    }

    if (status === 'failed' && errorMessage) {
      updateFields.push('error_message');
      updateValues.error_message = errorMessage;
    }

    const setClause = updateFields.map(field => `${field} = @${field}`).join(', ');

    const query = `
      UPDATE \`${currentProjectId}.${cleanDatasetId}.sheet_exports\`
      SET ${setClause}
      WHERE export_id = @export_id
    `;

    const queryOptions: any = {
      query,
      params: {
        export_id: exportId,
        ...updateValues,
      },
    };

    if (BQ_LOCATION && BQ_LOCATION.trim()) {
      queryOptions.location = BQ_LOCATION.trim();
    }

    await initializeBigQueryClient().query(queryOptions);
    console.log('✅ エクスポートステータスを更新しました:', { exportId, status });
  } catch (err: any) {
    console.error('[BQ update sheet_export status] error:', err?.message);
    throw err;
  }
}

export async function getSheetExports(
  projectId?: string,
  status?: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();

    let query = `
      SELECT *
      FROM \`${currentProjectId}.${cleanDatasetId}.sheet_exports\`
      WHERE 1=1
    `;

    const params: any = {};

    if (projectId) {
      query += ` AND project_id = @project_id`;
      params.project_id = projectId;
    }

    if (status) {
      query += ` AND export_status = @export_status`;
      params.export_status = status;
    }

    query += ` ORDER BY exported_at DESC LIMIT @limit`;
    params.limit = limit;

    const queryOptions: any = {
      query,
      params,
    };

    if (BQ_LOCATION && BQ_LOCATION.trim()) {
      queryOptions.location = BQ_LOCATION.trim();
    }

    const [rows] = await initializeBigQueryClient().query(queryOptions);
    return rows;
  } catch (err: any) {
    console.error('[BQ get sheet_exports] error:', err?.message);
    return [];
  }
}

export async function getSheetExportData(exportId: string): Promise<any[]> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();

    const query = `
      SELECT *
      FROM \`${currentProjectId}.${cleanDatasetId}.sheet_export_data\`
      WHERE export_id = @export_id
      ORDER BY row_index ASC
    `;

    const queryOptions: any = {
      query,
      params: {
        export_id: exportId,
      },
    };

    if (BQ_LOCATION && BQ_LOCATION.trim()) {
      queryOptions.location = BQ_LOCATION.trim();
    }

    const [rows] = await initializeBigQueryClient().query(queryOptions);
    return rows;
  } catch (err: any) {
    console.error('[BQ get sheet_export_data] error:', err?.message);
    return [];
  }
}

export async function runScheduledExport(): Promise<{
  success: boolean;
  totalProcessed: number;
  succeeded: number;
  failed: number;
  results: Array<{ exportId: string; success: boolean; rowsAdded?: number; error?: string }>;
}> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();

  const pendingQuery = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.sheet_exports\`
    WHERE export_status = 'pending'
    ORDER BY exported_at ASC
  `;
  const queryOptions: any = { query: pendingQuery };
  if (BQ_LOCATION && BQ_LOCATION.trim()) {
    queryOptions.location = BQ_LOCATION.trim();
  }

  const [pendingExports] = await initializeBigQueryClient().query(queryOptions);
  const results: Array<{ exportId: string; success: boolean; rowsAdded?: number; error?: string }> = [];

  for (const exportRecord of pendingExports) {
    const exportId = exportRecord.export_id;
    try {
      const dataRows = await getSheetExportData(exportId);
      if (dataRows.length === 0) {
        await updateSheetExportStatus(exportId, 'failed', 'no data rows found');
        results.push({ exportId, success: false, error: 'no data rows found' });
        continue;
      }

      const exportResult = await exportToGoogleSheets(dataRows);
      if (exportResult.success) {
        await updateSheetExportStatus(exportId, 'completed', null);
        results.push({ exportId, success: true, rowsAdded: exportResult.rowsAdded });
      } else {
        await updateSheetExportStatus(exportId, 'failed', exportResult.message);
        results.push({ exportId, success: false, error: exportResult.message });
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error';
      try {
        await updateSheetExportStatus(exportId, 'failed', errorMessage);
      } catch (_) {}
      results.push({ exportId, success: false, error: errorMessage });
    }
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  return {
    success: true,
    totalProcessed: results.length,
    succeeded,
    failed,
    results,
  };
}
