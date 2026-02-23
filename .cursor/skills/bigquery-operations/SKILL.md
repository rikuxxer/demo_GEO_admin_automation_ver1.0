---
name: bigquery-operations
description: UNIVERSEGEO プロジェクトにおける BigQuery のテーブル操作、クエリ作成、スキーマ変更、データ投入を支援する。BigQuery 関連の実装、デバッグ、スキーマ設計を依頼された際に使用する。
---

# BigQuery 操作

## 環境設定

```
GCP_PROJECT_ID          # 必須: GCP プロジェクトID
BQ_DATASET              # デフォルト: universegeo_dataset
BQ_LOCATION             # デフォルト: asia-northeast1
GOOGLE_APPLICATION_CREDENTIALS  # ローカル開発用のサービスアカウントキー
```

## クライアント初期化パターン

BigQuery クライアントは `backend/src/bigquery-client.ts` に集約されている。

```typescript
import { BigQuery } from '@google-cloud/bigquery';

const bqClient = initializeBigQueryClient();
const dataset = getDataset();
const table = dataset.table('table_name');
```

- 本番環境: Cloud Run のサービスアカウントで自動認証
- ローカル: `GOOGLE_APPLICATION_CREDENTIALS` で鍵ファイルパスを指定

## クエリ実行パターン

### SELECT（パラメータ化クエリ必須）

```typescript
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
```

**重要**: テーブル名はバッククォートで囲み、WHERE 条件には `@param` を使用すること。

### INSERT

```typescript
const dataset = getDataset();
const table = dataset.table('projects');
await table.insert([cleanedData], { ignoreUnknownValues: true });
```

### UPDATE / DELETE

BigQuery Streaming Insert はUPDATE/DELETEをサポートしないため、DML文を使用する：

```typescript
const query = `
  UPDATE \`${projectId}.${datasetId}.projects\`
  SET advertiser_name = @advertiser_name, updated_at = @updated_at
  WHERE project_id = @project_id
`;
```

## データ型の変換関数

| 関数 | 用途 | 入力例 | 出力例 |
|------|------|--------|--------|
| `formatDateForBigQuery()` | DATE 型 | `"2025/01/15"`, Date | `"2025-01-15"` |
| `formatTimestampForBigQuery()` | TIMESTAMP 型 | Date, ISO文字列 | ISO 8601 文字列 |
| `formatMediaIdArrayForBigQuery()` | ARRAY<STRING> | `"A,B,C"`, `["A","B"]` | `["A","B","C"]` |
| `formatDeliveryMediaForBigQuery()` | ARRAY<STRING> | 同上 | 同上 |

**全てのデータはinsert前にこれらの関数で正規化すること。**

## 主要テーブル

| テーブル名 | 主キー | 説明 |
|-----------|--------|------|
| `projects` | `project_id` | プロジェクト管理 |
| `segments` | `segment_id` | セグメント（配信設定） |
| `pois` | `poi_id` | POI（地点情報） |
| `id_counters` | `name` | 連番ID生成用カウンター |
| `user_requests` | `request_id` | ユーザー登録申請 |
| `messages` | `message_id` | プロジェクトメッセージ |
| `edit_requests` | `request_id` | 編集リクエスト |
| `change_history` | - | 変更履歴 |

## ID 生成パターン

```typescript
const nextNumber = await getNextIdFromCounter('project_id');
const projectId = `PRJ-${nextNumber}`;
```

- `id_counters` テーブルでシーケンス管理
- カウンター失敗時はタイムスタンプベースのフォールバック

## エラーハンドリング

BigQuery エラーは以下の構造で返す：

```typescript
{
  error: "エラーメッセージ",
  type: "BigQueryError",
  request_id: "correlation-id",
  errors: [...],           // BigQuery 詳細エラー
  missingColumns: [...],   // スキーマ不一致時のヒント
  hint: "修正のヒント"
}
```

## 新しいテーブル追加時のチェックリスト

```
- [ ] bigquery-client.ts にCRUD関数を追加
- [ ] テーブル名の定数を定義
- [ ] データ正規化（日付・タイムスタンプ・配列）を実装
- [ ] パラメータ化クエリを使用
- [ ] location を指定
- [ ] エラーハンドリングを実装
- [ ] index.ts にAPIエンドポイントを追加
- [ ] src/types/schema.ts に型定義を追加
```
