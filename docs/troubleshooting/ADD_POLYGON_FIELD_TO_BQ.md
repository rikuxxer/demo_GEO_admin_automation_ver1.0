# BigQueryテーブルにpolygonフィールドを追加する手順

## 概要

ポリゴン指定機能の実装により、`pois`テーブルに`polygon`フィールドが必要です。
このフィールドは既にコードで使用されていますが、テーブル定義に明示的に記載されていないため、追加が必要な場合があります。

## 現在の状況

### コードでの使用状況
- ✅ `backend/src/bigquery-client.ts`で`polygon`フィールドが`allowedFields`に含まれている
- ✅ `polygon`フィールドはSTRING型としてJSON文字列形式で保存される
- ✅ 形式: `"[[lat1, lng1], [lat2, lng2], ...]"` (JSON文字列)

### テーブル定義の状況
- ✅ `BIGQUERY_SETUP.md`の`pois`テーブル定義に`polygon`フィールドを追加済み
- ✅ 実際のBigQueryテーブルに`polygon`フィールドが追加済み（確認済み: 2025年1月）

## 確認方法

### 1. BigQueryでテーブルスキーマを確認

```sql
SELECT column_name, data_type, is_nullable
FROM `universegeo_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'pois'
ORDER BY ordinal_position;
```

### 2. polygonフィールドが存在しない場合

以下のSQLを実行して`polygon`フィールドを追加：

```sql
ALTER TABLE `universegeo_dataset.pois`
ADD COLUMN IF NOT EXISTS polygon STRING;
```

## フィールド仕様

- **フィールド名**: `polygon`
- **データ型**: `STRING`
- **NULL許可**: `YES` (NULLABLE)
- **説明**: ポリゴン座標をJSON文字列形式で保存
- **形式**: `"[[lat1, lng1], [lat2, lng2], [lat3, lng3], ...]"`
- **例**: `"[[35.681236, 139.767125], [35.682236, 139.768125], [35.683236, 139.769125]]"`

## 注意事項

1. **既存データへの影響**: 既存のレコードには`NULL`が設定されます
2. **後方互換性**: 既存のコードは`polygon`フィールドが`NULL`の場合も正常に動作します
3. **データ形式**: コードでは`number[][]`形式で処理されますが、BigQueryにはJSON文字列として保存されます

## 実装の変更点

今回の実装（POLYGON形式の表示機能）では：
- ✅ 既存の`polygon`フィールドを使用（新規フィールドは追加していない）
- ✅ フロントエンドでの表示・変換処理のみ（データベーススキーマへの変更なし）
- ⚠️ ただし、テーブルに`polygon`フィールドが存在しない場合は追加が必要

## ✅ 完了状況

**`polygon`フィールドは既に追加済みです**（確認日: 2025年1月）

## 現在のスキーマ状況（確認済み）

以下の18列が存在します：
1. poi_id (STRING, REQUIRED)
2. project_id (STRING, REQUIRED)
3. segment_id (STRING, NULLABLE)
4. location_id (STRING, NULLABLE)
5. poi_name (STRING, REQUIRED)
6. address (STRING, NULLABLE)
7. latitude (FLOAT, NULLABLE)
8. longitude (FLOAT, NULLABLE)
9. prefectures (STRING, REPEATED) - ARRAY<STRING>と同等
10. cities (STRING, REPEATED) - ARRAY<STRING>と同等
11. poi_type (STRING, NULLABLE)
12. poi_category (STRING, NULLABLE)
13. designated_radius (STRING, NULLABLE)
14. setting_flag (STRING, NULLABLE)
15. visit_measurement_group_id (STRING, NULLABLE)
16. created_at (TIMESTAMP, NULLABLE)
17. updated_at (TIMESTAMP, NULLABLE)
18. **polygon (STRING, NULLABLE)** ✅ 追加済み

## スキーマの注意点

- `prefectures`と`cities`は`STRING REPEATED`（ARRAY<STRING>と同等）
- `latitude`と`longitude`は`FLOAT`（FLOAT64と同等）
- `polygon`フィールドは`STRING NULLABLE`として正しく追加されています
