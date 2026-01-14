# BigQueryコスト削減実装ガイド

## 概要

このガイドでは、BigQueryのコスト削減を実装するための具体的な手順を説明します。

## 実装優先順位

### フェーズ1: 即座に実装（1週間以内）

#### 1. SELECT * を避ける

**対象ファイル**: `backend/src/bigquery-client.ts`

**変更例**:
```typescript
// 変更前
const query = `SELECT * FROM \`${datasetId}.projects\``;

// 変更後
const query = `
  SELECT 
    project_id,
    advertiser_name,
    appeal_point,
    project_status,
    _register_datetime,
    created_at,
    updated_at
  FROM \`${datasetId}.projects\`
`;
```

**実装箇所**:
- `getProjects()`: プロジェクト一覧取得
- `getSegments()`: セグメント一覧取得
- `getPois()`: POI一覧取得
- `getPoisByProject()`: プロジェクト別POI取得

**効果**: 50-60%のコスト削減

#### 2. クエリ結果キャッシュの有効化

**対象ファイル**: `backend/src/bigquery-client.ts`

**変更例**:
```typescript
const queryOptions: any = {
  query: query,
  useQueryCache: true,  // 追加
  useLegacySql: false,
};
```

**効果**: 20-40%のコスト削減（キャッシュヒット率による）

### フェーズ2: 短期実装（1-2週間以内）

#### 3. ページネーションの実装

**対象ファイル**: 
- `backend/src/bigquery-client.ts`
- `src/components/ProjectList.tsx`（フロントエンド）

**実装例**:
```typescript
async getProjects(page: number = 1, pageSize: number = 50): Promise<{
  projects: any[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const offset = (page - 1) * pageSize;
  const query = `
    SELECT 
      project_id,
      advertiser_name,
      -- 必要な列のみ
    FROM \`${datasetId}.projects\`
    ORDER BY COALESCE(_register_datetime, created_at, updated_at) DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;
  
  // 総件数を取得
  const countQuery = `SELECT COUNT(*) as total FROM \`${datasetId}.projects\``;
  
  const [rows] = await bigquery.query({ query });
  const [countRows] = await bigquery.query({ query: countQuery });
  
  return {
    projects: rows,
    total: countRows[0].total,
    page,
    pageSize,
  };
}
```

**効果**: スキャン量の固定化

#### 4. データ保持期間の設定

**実行方法**: BigQueryコンソールまたはCloud Shell

```sql
-- POIテーブル: 3年で自動削除
ALTER TABLE `universegeo_dataset.pois`
SET OPTIONS(
  partition_expiration_days=1095
);
```

**効果**: ストレージコストの削減

### フェーズ3: 中期実装（1-3ヶ月以内）

#### 5. パーティションプルーニングの活用

**対象ファイル**: `backend/src/bigquery-client.ts`

**実装例**:
```typescript
async getPoisByProject(
  project_id: string,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  let query = `
    SELECT 
      poi_id,
      project_id,
      segment_id,
      location_id,
      poi_name,
      -- 必要な列のみ
    FROM \`${datasetId}.pois\`
    WHERE project_id = @project_id
  `;
  
  // 日付範囲を指定してパーティションプルーニングを活用
  if (startDate && endDate) {
    query += ` AND created_at >= @start_date AND created_at < @end_date`;
  } else {
    // デフォルト: 過去1年
    query += ` AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 YEAR)`;
  }
  
  query += ` ORDER BY created_at DESC LIMIT 1000`;
  
  // クエリパラメータを設定
  const queryOptions = {
    query,
    params: {
      project_id,
      start_date: startDate,
      end_date: endDate,
    },
  };
  
  const [rows] = await bigquery.query(queryOptions);
  return rows;
}
```

**効果**: 70-80%のコスト削減

#### 6. クラスタリングの追加

**注意**: 既存テーブルにクラスタリングを追加する場合は、テーブルを再作成する必要があります

**実装手順**:
1. 新しいクラスタリング付きテーブルを作成
2. 既存データをコピー
3. テーブル名を入れ替え

**SQL例**:
```sql
-- 新しいテーブルを作成
CREATE TABLE `universegeo_dataset.pois_clustered`
(
  -- フィールド定義（既存と同じ）
)
PARTITION BY DATE(created_at)
CLUSTER BY project_id, segment_id;

-- データをコピー
INSERT INTO `universegeo_dataset.pois_clustered`
SELECT * FROM `universegeo_dataset.pois`;

-- テーブル名を入れ替え（慎重に実行）
-- DROP TABLE `universegeo_dataset.pois`;
-- ALTER TABLE `universegeo_dataset.pois_clustered` RENAME TO `pois`;
```

**効果**: 10-30%のコスト削減

### フェーズ4: 長期実装（必要に応じて）

#### 7. マテリアライズドビューの作成

**用途**: 案件サマリなどの集計結果を事前計算

**SQL例**:
```sql
CREATE MATERIALIZED VIEW `universegeo_dataset.project_summary_mv`
PARTITION BY DATE(_snapshot_date)
CLUSTER BY project_status
OPTIONS(
  enable_refresh=true,
  refresh_interval_minutes=60
)
AS
SELECT 
  CURRENT_DATE() as _snapshot_date,
  project_status,
  COUNT(*) as project_count
FROM `universegeo_dataset.projects`
GROUP BY project_status;
```

**効果**: 集計クエリの高速化

#### 8. データアーカイブ戦略

**実装手順**:
1. Cloud Storageバケットを作成
2. 3年以上古いデータをエクスポート
3. BigQueryから削除

**スクリプト例**: `docs/scripts/archive_old_data.sh` を参照

**効果**: ストレージコストの80%削減

## 実装チェックリスト

### フェーズ1（1週間以内）
- [ ] `SELECT *` を必要な列のみに変更
- [ ] クエリ結果キャッシュを有効化
- [ ] コスト監視クエリを実行してベースラインを確認

### フェーズ2（1-2週間以内）
- [ ] ページネーションを実装
- [ ] データ保持期間を設定
- [ ] コスト削減効果を測定

### フェーズ3（1-3ヶ月以内）
- [ ] パーティションプルーニングを活用
- [ ] クラスタリングを追加（必要に応じて）
- [ ] キャッシュ戦略を最適化

### フェーズ4（必要に応じて）
- [ ] マテリアライズドビューを作成
- [ ] データアーカイブ戦略を実装
- [ ] 継続的なコスト監視を設定

## 効果測定

### 実装前のベースライン測定

```sql
-- 月間スキャン量を確認
SELECT 
  SUM(total_bytes_processed) / 1024 / 1024 / 1024 / 1024 as total_tb
FROM `region-asia-northeast1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE 
  DATE(creation_time) >= DATE_TRUNC(CURRENT_DATE(), MONTH)
  AND job_type = 'QUERY'
  AND state = 'DONE';
```

### 実装後の効果測定

各フェーズの実装後、同じクエリを実行して効果を確認してください。

## 注意事項

1. **バックアップ**: テーブル構造を変更する前に必ずバックアップを取る
2. **段階的実装**: 一度にすべてを変更せず、段階的に実装する
3. **テスト**: 本番環境に適用する前に、テスト環境で十分にテストする
4. **監視**: 実装後はコストを継続的に監視する

## 関連ドキュメント

- [BigQueryコスト最適化ガイド](./BIGQUERY_COST_OPTIMIZATION.md)
- [クエリ最適化スクリプト](../scripts/optimize_bigquery_queries.sql)
- [コスト監視スクリプト](../scripts/monitor_bigquery_costs.sql)
