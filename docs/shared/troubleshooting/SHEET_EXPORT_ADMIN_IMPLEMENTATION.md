# スプレッドシートエクスポート管理機能の実装ガイド

## 概要

管理部側の画面からスプレッドシートエクスポート履歴を管理できる機能を実装します。

## 実装内容

1. **エクスポート履歴一覧表示**
2. **エクスポート履歴詳細表示**
3. **再エクスポート機能**
4. **エクスポートデータの確認**

## テーブル作成手順

**詳細な手順は [テーブル作成ガイド](./TABLE_CREATION_GUIDE.md) を参照してください。**

### クイックスタート

#### 方法1: BigQueryコンソールで実行（推奨）

1. [Google Cloud Console](https://console.cloud.google.com/) → BigQuery を開く
2. 「クエリを作成」をクリック
3. `docs/scripts/create_sheet_export_tables.sql` の内容をコピー&ペースト
4. 「実行」をクリック

#### 方法2: Cloud Shellで実行

```bash
# プロジェクトディレクトリに移動
cd /path/to/UNIVERSEGEO_backup

# SQLファイルを実行
bq query --use_legacy_sql=false < docs/scripts/create_sheet_export_tables.sql
```

### テーブル作成の確認

```sql
-- テーブルが作成されたか確認
SELECT 
  table_name,
  ROUND(size_bytes / 1024 / 1024, 2) as size_mb,
  row_count,
  created,
  modified
FROM `universegeo_dataset.__TABLES__`
WHERE table_name IN ('sheet_exports', 'sheet_export_data')
ORDER BY table_name;
```

## 💻 実装手順

### ステップ1: バックエンド実装

#### 1-1. `backend/src/bigquery-client.ts`に関数を追加

実装例は `docs/troubleshooting/SPREADSHEET_EXPORT_TABLE_ACCUMULATION.md` を参照してください。

主要な関数：
- `exportToGoogleSheetsWithAccumulation()`: テーブル蓄積付きエクスポート
- `createSheetExport()`: エクスポート履歴作成
- `createSheetExportDataBulk()`: エクスポートデータ一括作成
- `updateSheetExportStatus()`: エクスポートステータス更新
- `getSheetExports()`: エクスポート履歴取得
- `getSheetExportData()`: エクスポートデータ取得

#### 1-2. `backend/src/index.ts`にAPIエンドポイントを追加

```typescript
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

// エクスポートデータ取得
app.get('/api/sheets/exports/:exportId/data', async (req, res) => {
  try {
    const { exportId } = req.params;
    const exportData = await bqService.getSheetExportData(exportId);
    res.json(exportData);
  } catch (error: any) {
    console.error('エクスポートデータ取得エラー:', error);
    res.status(500).json({ error: error.message || 'エクスポートデータの取得に失敗しました' });
  }
});

// 再エクスポート
app.post('/api/sheets/exports/:exportId/reexport', async (req, res) => {
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

    // 元のエクスポート履歴を取得
    const exports = await bqService.getSheetExports();
    const exportRecord = exports.find(e => e.export_id === exportId);

    if (!exportRecord) {
      return res.status(404).json({ error: 'エクスポート履歴が見つかりません' });
    }

    // 新しいエクスポートとして実行
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

### ステップ2: フロントエンド実装

#### 2-1. エクスポート履歴管理コンポーネントを作成

`src/components/SheetExportHistory.tsx` を作成（後述）

#### 2-2. AdminDashboardに追加

`src/components/AdminDashboard.tsx` にエクスポート履歴セクションを追加

### ステップ3: 既存のエクスポート処理を更新

既存のエクスポート処理を `exportToGoogleSheetsWithAccumulation` を使用するように更新

## 📝 実装詳細

### エクスポート履歴管理コンポーネント

`src/components/SheetExportHistory.tsx` を作成します（次のステップで実装）。

### AdminDashboardへの統合

`src/components/AdminDashboard.tsx` に新しいセクションを追加します。

## 🔍 動作確認

### 1. テーブル作成の確認

```sql
-- テーブルが存在するか確認
SELECT table_name 
FROM `universegeo_dataset.__TABLES__`
WHERE table_name IN ('sheet_exports', 'sheet_export_data');
```

### 2. エクスポート実行の確認

1. 地点登録依頼を実行
2. エクスポート履歴がテーブルに保存されているか確認
3. スプレッドシートに書き出されているか確認

### 3. 管理画面での確認

1. 管理画面でエクスポート履歴一覧を表示
2. エクスポート履歴の詳細を確認
3. 再エクスポート機能をテスト

## 📚 関連ドキュメント

- [スプレッドシートエクスポートテーブル蓄積ガイド](./SPREADSHEET_EXPORT_TABLE_ACCUMULATION.md)
- [BigQueryテーブル定義書](../BIGQUERY_TABLE_DEFINITIONS.md)
- [テーブル作成SQLスクリプト](../scripts/create_sheet_export_tables.sql)
