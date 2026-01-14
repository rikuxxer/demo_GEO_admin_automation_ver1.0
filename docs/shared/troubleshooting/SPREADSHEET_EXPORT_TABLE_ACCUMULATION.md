# スプレッドシート書き出し前のテーブル蓄積機能

## 概要

スプレッドシートへの書き出しを行う前に、その内容をBigQueryテーブルに蓄積する機能の実装案です。

## 目的

1. **エクスポート履歴の管理**: いつ、何を、誰がエクスポートしたかを記録
2. **データの追跡可能性**: エクスポートされたデータの履歴を保持
3. **エラー時の復旧**: スプレッドシート書き出しに失敗した場合でも、データはテーブルに保存済み
4. **再エクスポート機能**: テーブルから過去のエクスポートデータを再エクスポート可能
5. **監査ログ**: エクスポート履歴を監査目的で利用

## テーブル設計

### 1. sheet_exports（エクスポート履歴テーブル）

**説明**: スプレッドシートへのエクスポート履歴を管理

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.sheet_exports` (
  export_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  exported_by STRING NOT NULL,
  exported_by_name STRING NOT NULL,
  export_status STRING NOT NULL,
  spreadsheet_id STRING,
  sheet_name STRING,
  row_count INTEGER,
  exported_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  error_message STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(exported_at)
OPTIONS(
  description="スプレッドシートエクスポート履歴"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `export_id` | STRING | NO | エクスポートID（主キー） | `EXP-20250113-001` |
| `project_id` | STRING | NO | 案件ID | `PRJ-1` |
| `segment_id` | STRING | YES | セグメントID | `SEG-1` |
| `exported_by` | STRING | NO | エクスポート実行者（user_id） | `user-sales-001` |
| `exported_by_name` | STRING | NO | エクスポート実行者名 | `営業太郎` |
| `export_status` | STRING | NO | エクスポートステータス | `pending`, `completed`, `failed` |
| `spreadsheet_id` | STRING | YES | スプレッドシートID | `1a2b3c4d5e6f7g8h` |
| `sheet_name` | STRING | YES | シート名 | `シート1` |
| `row_count` | INTEGER | YES | エクスポート行数 | `100` |
| `exported_at` | TIMESTAMP | NO | エクスポート開始日時（パーティションキー） | `2025-01-13 10:00:00 UTC` |
| `completed_at` | TIMESTAMP | YES | エクスポート完了日時 | `2025-01-13 10:01:00 UTC` |
| `error_message` | STRING | YES | エラーメッセージ | `API Error: 403` |
| `created_at` | TIMESTAMP | YES | 作成日時 | `2025-01-13 10:00:00 UTC` |
| `updated_at` | TIMESTAMP | YES | 更新日時 | `2025-01-13 10:01:00 UTC` |

### 2. sheet_export_data（エクスポートデータテーブル）

**説明**: エクスポートされたデータの詳細を保存

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.sheet_export_data` (
  export_data_id STRING NOT NULL,
  export_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  poi_id STRING,
  category_id STRING,
  brand_id STRING,
  brand_name STRING,
  poi_name STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  prefecture STRING,
  city STRING,
  radius STRING,
  polygon STRING,
  setting_flag STRING,
  created STRING,
  row_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY export_id, project_id
OPTIONS(
  description="スプレッドシートエクスポートデータ"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `export_data_id` | STRING | NO | エクスポートデータID（主キー） | `EXPD-20250113-001-001` |
| `export_id` | STRING | NO | エクスポートID（外部キー） | `EXP-20250113-001` |
| `project_id` | STRING | NO | 案件ID | `PRJ-1` |
| `segment_id` | STRING | YES | セグメントID | `SEG-1` |
| `poi_id` | STRING | YES | 地点ID | `POI-1` |
| `category_id` | STRING | YES | カテゴリID | `CAT-001` |
| `brand_id` | STRING | YES | ブランドID | - |
| `brand_name` | STRING | YES | ブランド名 | `サンプルブランド` |
| `poi_name` | STRING | YES | 地点名 | `東京駅` |
| `latitude` | FLOAT64 | YES | 緯度 | `35.681236` |
| `longitude` | FLOAT64 | YES | 経度 | `139.767125` |
| `prefecture` | STRING | YES | 都道府県 | `東京都` |
| `city` | STRING | YES | 市区町村 | `千代田区` |
| `radius` | STRING | YES | 半径 | `50m` |
| `polygon` | STRING | YES | ポリゴン（JSON文字列） | `"[[35.681236, 139.767125], ...]"` |
| `setting_flag` | STRING | YES | 設定フラグ | `2` |
| `created` | STRING | YES | 作成日（YYYY/MM/DD形式） | `2025/01/13` |
| `row_index` | INTEGER | YES | 行番号（スプレッドシート内） | `1` |
| `created_at` | TIMESTAMP | YES | 作成日時（パーティションキー） | `2025-01-13 10:00:00 UTC` |

## 実装フロー

### 現在のフロー

```
[フロントエンド] → [バックエンドAPI] → [Google Sheets API] → [スプレッドシート]
```

### 改善後のフロー

```
[フロントエンド] 
  ↓
[バックエンドAPI]
  ↓
[1. テーブルにデータを保存] (sheet_exports + sheet_export_data)
  ↓
[2. スプレッドシートに書き出し] (Google Sheets API)
  ↓
[3. ステータス更新] (export_status = 'completed' or 'failed')
  ↓
[スプレッドシート]
```

## 実装例

### バックエンド実装（`backend/src/bigquery-client.ts`）

```typescript
// ==================== スプレッドシートエクスポート（テーブル蓄積付き） ====================

/**
 * スプレッドシートへのエクスポート（テーブルに蓄積してから書き出し）
 */
async exportToGoogleSheetsWithAccumulation(
  rows: any[],
  projectId: string,
  segmentId?: string,
  exportedBy?: string,
  exportedByName?: string
): Promise<{
  success: boolean;
  message: string;
  exportId?: string;
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

  // エクスポートIDを生成
  const exportId = `EXP-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Math.floor(Math.random() * 10000)).padStart(3, '0')}`;
  
  try {
    // ========== ステップ1: テーブルにデータを保存 ==========
    console.log('ステップ1: エクスポート履歴をテーブルに保存中...');
    
    // 1-1. エクスポート履歴を保存
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
      exported_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
    };

    await this.createSheetExport(exportRecord);

    // 1-2. エクスポートデータを保存
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

    await this.createSheetExportDataBulk(exportDataRecords);

    console.log('エクスポート履歴とデータをテーブルに保存完了:', {
      exportId,
      rowCount: rows.length,
    });

    // ========== ステップ2: スプレッドシートに書き出し ==========
    console.log('ステップ2: スプレッドシートに書き出し中...');
    
    const exportResult = await this.exportToGoogleSheets(rows);

    // ========== ステップ3: ステータス更新 ==========
    if (exportResult.success) {
      // 成功時: ステータスを'completed'に更新
      await this.updateSheetExportStatus(exportId, 'completed', null);
      
      console.log('エクスポート完了:', {
        exportId,
        rowsAdded: exportResult.rowsAdded,
      });

      return {
        success: true,
        message: `${exportResult.rowsAdded || rows.length}件のデータをスプレッドシートに追加しました（エクスポートID: ${exportId}）`,
        exportId,
        rowsAdded: exportResult.rowsAdded || rows.length,
      };
    } else {
      // 失敗時: ステータスを'failed'に更新
      await this.updateSheetExportStatus(exportId, 'failed', exportResult.message);
      
      console.error('エクスポート失敗:', {
        exportId,
        error: exportResult.message,
      });

      return {
        success: false,
        message: `スプレッドシートへの書き出しに失敗しました。データはテーブルに保存されています（エクスポートID: ${exportId}）。エラー: ${exportResult.message}`,
        exportId,
      };
    }
  } catch (error: any) {
    // エラー時: ステータスを'failed'に更新
    const errorMessage = error?.message || 'Unknown error';
    await this.updateSheetExportStatus(exportId, 'failed', errorMessage).catch(() => {
      // ステータス更新に失敗しても続行
    });

    console.error('エクスポート処理エラー:', error);
    return {
      success: false,
      message: `エクスポート処理中にエラーが発生しました。エラー: ${errorMessage}`,
      exportId,
    };
  }
}

/**
 * エクスポート履歴を作成
 */
async createSheetExport(export: any): Promise<void> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();

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
      export_id: export.export_id.trim(),
    };

    for (const field of allowedFields) {
      if (field in export && export[field] !== undefined && export[field] !== null) {
        if (field === 'exported_at' || field === 'completed_at') {
          cleanedExport[field] = formatTimestampForBigQuery(export[field]);
        } else if (field === 'row_count') {
          const numValue = typeof export[field] === 'string' ? parseInt(export[field]) : export[field];
          if (!isNaN(numValue)) {
            cleanedExport[field] = numValue;
          }
        } else {
          cleanedExport[field] = export[field];
        }
      }
    }

    const now = new Date();
    cleanedExport.created_at = formatTimestampForBigQuery(export.created_at || now);
    cleanedExport.updated_at = formatTimestampForBigQuery(export.updated_at || now);

    await getDataset().table('sheet_exports').insert([cleanedExport], { ignoreUnknownValues: true });
    console.log('エクスポート履歴を作成しました:', export.export_id);
  } catch (err: any) {
    console.error('[BQ insert sheet_export] error:', err?.message);
    throw err;
  }
}

/**
 * エクスポートデータを一括作成
 */
async createSheetExportDataBulk(exportData: any[]): Promise<void> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();

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
    console.log(`エクスポートデータを一括作成しました: ${cleanedData.length}件`);
  } catch (err: any) {
    console.error('[BQ insert sheet_export_data bulk] error:', err?.message);
    throw err;
  }
}

/**
 * エクスポートステータスを更新
 */
async updateSheetExportStatus(
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
    console.log('エクスポートステータスを更新しました:', { exportId, status });
  } catch (err: any) {
    console.error('[BQ update sheet_export status] error:', err?.message);
    throw err;
  }
}

/**
 * エクスポート履歴を取得
 */
async getSheetExports(
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

/**
 * エクスポートデータを取得（再エクスポート用）
 */
async getSheetExportData(exportId: string): Promise<any[]> {
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
```

### バックエンドAPIエンドポイント（`backend/src/index.ts`）

```typescript
// エクスポート（テーブル蓄積付き）
app.post('/api/sheets/export-with-accumulation', async (req, res) => {
  try {
    const { rows, projectId, segmentId, exportedBy, exportedByName } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows配列が必要です' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'projectIdが必要です' });
    }

    const result = await bqService.exportToGoogleSheetsWithAccumulation(
      rows,
      projectId,
      segmentId,
      exportedBy,
      exportedByName
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error: any) {
    console.error('エクスポートエラー:', error);
    res.status(500).json({ error: error.message || 'エクスポート処理中にエラーが発生しました' });
  }
});

// エクスポート履歴取得
app.get('/api/sheets/exports', async (req, res) => {
  try {
    const { projectId, status, limit } = req.query;
    const exports = await bqService.getSheetExports(
      projectId as string,
      status as string,
      limit ? parseInt(limit as string) : 100
    );
    res.json(exports);
  } catch (error: any) {
    console.error('エクスポート履歴取得エラー:', error);
    res.status(500).json({ error: error.message || 'エクスポート履歴の取得に失敗しました' });
  }
});

// 再エクスポート
app.post('/api/sheets/reexport/:exportId', async (req, res) => {
  try {
    const { exportId } = req.params;
    const exportData = await bqService.getSheetExportData(exportId);

    if (exportData.length === 0) {
      return res.status(404).json({ error: 'エクスポートデータが見つかりません' });
    }

    // データをスプレッドシート形式に変換
    const rows = exportData.map(data => ({
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

    // 新しいエクスポートとして実行
    const exportRecord = await bqService.getSheetExport(exportId);
    const result = await bqService.exportToGoogleSheetsWithAccumulation(
      rows,
      exportRecord.project_id,
      exportRecord.segment_id,
      exportRecord.exported_by,
      exportRecord.exported_by_name
    );

    res.json(result);
  } catch (error: any) {
    console.error('再エクスポートエラー:', error);
    res.status(500).json({ error: error.message || '再エクスポート処理中にエラーが発生しました' });
  }
});
```

### フロントエンド実装（`src/utils/googleSheets.ts`）

```typescript
/**
 * スプレッドシートに行を追加（テーブル蓄積付き）
 */
export async function appendRowsToSheetWithAccumulation(
  rows: SheetRow[],
  projectId: string,
  segmentId?: string,
  exportedBy?: string,
  exportedByName?: string
): Promise<{
  success: boolean;
  message: string;
  exportId?: string;
  rowsAdded?: number;
}> {
  // バックエンドAPIを使用する場合
  if (USE_BACKEND_API) {
    try {
      console.log('バックエンドAPI経由でスプレッドシートに送信（テーブル蓄積付き）:', {
        rowCount: rows.length,
        projectId,
        segmentId,
      });

      const response = await fetch(`${API_BASE_URL}/api/sheets/export-with-accumulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows,
          projectId,
          segmentId,
          exportedBy,
          exportedByName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'スプレッドシートへの出力に失敗しました');
      }

      const result = await response.json();
      console.log('スプレッドシートに追加成功（テーブル蓄積済み）:', result);
      return result;
    } catch (error) {
      console.error('バックエンドAPI エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'スプレッドシートへの出力に失敗しました';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  // 直接Google Sheets APIを使用する場合（開発環境）
  // この場合はテーブル蓄積なしで従来通り
  return appendRowsToSheet(rows);
}
```

## メリット

### 1. データの追跡可能性
- いつ、誰が、何をエクスポートしたかを記録
- エクスポート履歴の検索・フィルタリングが可能

### 2. エラー時の復旧
- スプレッドシート書き出しに失敗しても、データはテーブルに保存済み
- 後から再エクスポート可能

### 3. 監査ログ
- エクスポート履歴を監査目的で利用可能
- データの変更履歴を追跡

### 4. 再エクスポート機能
- 過去のエクスポートデータを再エクスポート可能
- スプレッドシートが誤って削除された場合でも復旧可能

### 5. データ分析
- エクスポート頻度、エクスポート量などの分析が可能
- プロジェクト別、セグメント別のエクスポート統計

## 注意事項

### 1. ストレージコスト
- `sheet_export_data`テーブルはデータ量が大きくなる可能性
- パーティション有効期限を設定して古いデータを自動削除することを推奨

### 2. パフォーマンス
- 大量データのエクスポート時は、テーブルへの保存に時間がかかる可能性
- バッチ処理を検討

### 3. データ保持期間
- エクスポートデータの保持期間を設定（例: 1年）
- パーティション有効期限を活用

## 実装手順

### ステップ1: テーブル作成

```sql
-- エクスポート履歴テーブル
CREATE TABLE `universegeo_dataset.sheet_exports` (
  -- 上記のCREATE文を実行
);

-- エクスポートデータテーブル
CREATE TABLE `universegeo_dataset.sheet_export_data` (
  -- 上記のCREATE文を実行
);
```

### ステップ2: バックエンド実装

1. `backend/src/bigquery-client.ts`に上記の関数を追加
2. `backend/src/index.ts`にAPIエンドポイントを追加

### ステップ3: フロントエンド実装

1. `src/utils/googleSheets.ts`に`appendRowsToSheetWithAccumulation`関数を追加
2. エクスポート処理を呼び出している箇所を更新

### ステップ4: テスト

1. エクスポート実行
2. テーブルにデータが保存されているか確認
3. スプレッドシートに書き出されているか確認
4. 再エクスポート機能をテスト

## データ保持期間の設定（推奨）

```sql
-- エクスポート履歴: 2年で自動削除
ALTER TABLE `universegeo_dataset.sheet_exports`
SET OPTIONS(
  partition_expiration_days=730
);

-- エクスポートデータ: 1年で自動削除
ALTER TABLE `universegeo_dataset.sheet_export_data`
SET OPTIONS(
  partition_expiration_days=365
);
```

## 関連ドキュメント

- [BigQueryテーブル定義書](../BIGQUERY_TABLE_DEFINITIONS.md)
- [スプレッドシート書き出しロジック](./SPREADSHEET_EXPORT_LOGIC.md)
