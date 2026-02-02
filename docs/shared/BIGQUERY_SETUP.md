# BigQuery 接続セットアップガイド

現在、アプリケーションはlocalStorageを使用したモック実装になっています。
本番環境でBigQueryに接続するための手順を説明します。

---

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [BigQueryのセットアップ](#bigqueryのセットアップ)
3. [バックエンドAPIの実装](#バックエンドapiの実装)
4. [フロントエンドの接続](#フロントエンドの接続)
5. [デプロイ方法](#デプロイ方法)

---

## アーキテクチャ概要

### 現在の構成（開発環境）

```
React App (フロントエンド)
  ↓
src/utils/bigquery.ts (モック実装)
  ↓
localStorage（ブラウザ内のみ）
```

### 推奨する本番構成

```
React App (フロントエンド)
  ↓ REST API
Backend API (Cloud Run / Cloud Functions)
  ↓ BigQuery Client Library
BigQuery (データベース)
```

**重要**: セキュリティ上の理由から、フロントエンドから直接BigQueryに接続することは**推奨されません**。

---

## BigQueryのセットアップ

### 1. BigQueryプロジェクトの作成

```bash
# GCPプロジェクトを作成（既存の場合はスキップ）
gcloud projects create universegeo-project

# プロジェクトを設定
gcloud config set project universegeo-project

# BigQuery APIを有効化
gcloud services enable bigquery.googleapis.com
```

### 2. データセットの作成

```bash
# データセットを作成（東京リージョン）
bq mk --dataset \
  --location=asia-northeast1 \
  --description="UNIVERSEGEO案件管理データ" \
  universegeo_project:universegeo_dataset
```

### 3. テーブル定義の作成

以下のSQLを実行してテーブルを作成します：

#### プロジェクトテーブル

```sql
CREATE TABLE `universegeo_dataset.projects` (
  project_id STRING NOT NULL,
  _register_datetime TIMESTAMP,
  advertiser_name STRING,
  appeal_point STRING,
  delivery_start_date DATE,
  delivery_end_date DATE,
  person_in_charge STRING,
  sub_person_in_charge STRING,
  universe_service_id STRING,
  universe_service_name STRING,
  project_status STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(_register_datetime)
OPTIONS(
  description="案件情報"
);
```

#### セグメントテーブル

```sql
CREATE TABLE `universegeo_dataset.segments` (
  segment_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_name STRING,
  segment_registered_at TIMESTAMP,
  delivery_media ARRAY<STRING>,
  media_id ARRAY<STRING>,
  attribute STRING,
  extraction_period STRING,
  extraction_start_date DATE,
  extraction_end_date DATE,
  detection_count STRING,
  detection_time_start TIME,
  detection_time_end TIME,
  stay_time STRING,
  designated_radius STRING,
  location_request_status STRING,
  data_coordination_date DATE,
  delivery_confirmed BOOL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(segment_registered_at)
OPTIONS(
  description="セグメント情報"
);
```

#### POI（地点）テーブル

```sql
CREATE TABLE `universegeo_dataset.pois` (
  poi_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  location_id STRING,
  poi_name STRING NOT NULL,
  address STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  prefectures ARRAY<STRING>,
  cities ARRAY<STRING>,
  poi_type STRING,
  poi_category STRING,
  designated_radius STRING,
  setting_flag STRING,
  visit_measurement_group_id STRING,
  polygon STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
OPTIONS(
  description="POI（地点）情報"
);
```

#### ユーザーテーブル

```sql
CREATE TABLE `universegeo_dataset.users` (
  user_id STRING NOT NULL,
  name STRING NOT NULL,
  email STRING NOT NULL,
  password_hash STRING NOT NULL,
  role STRING NOT NULL,
  department STRING,
  is_active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  last_login TIMESTAMP
)
OPTIONS(
  description="ユーザー情報"
);
```

#### メッセージテーブル

```sql
CREATE TABLE `universegeo_dataset.messages` (
  message_id STRING NOT NULL,
  project_id STRING NOT NULL,
  sender_id STRING NOT NULL,
  sender_name STRING NOT NULL,
  sender_role STRING NOT NULL,
  content STRING NOT NULL,
  message_type STRING,
  is_read BOOL DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(timestamp)
OPTIONS(
  description="プロジェクトメッセージ"
);
```

---

## バックエンドAPIの実装

### 推奨構成: Cloud Functions (Node.js)

#### 1. プロジェクトのセットアップ

```bash
# バックエンド用ディレクトリを作成
mkdir backend
cd backend

# package.jsonを作成
npm init -y

# 依存関係をインストール
npm install @google-cloud/bigquery express cors
npm install --save-dev @types/express @types/cors typescript
```

#### 2. BigQueryクライアントの実装

`backend/src/bigquery-client.ts`:

```typescript
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE, // サービスアカウントキー
});

const dataset = bigquery.dataset('universegeo_dataset');

export class BigQueryService {
  // プロジェクト取得
  async getProjects(): Promise<any[]> {
    const query = `
      SELECT *
      FROM \`universegeo_dataset.projects\`
      ORDER BY _register_datetime DESC
    `;
    const [rows] = await bigquery.query(query);
    return rows;
  }

  // プロジェクト作成
  async createProject(project: any): Promise<void> {
    await dataset.table('projects').insert([project]);
  }

  // プロジェクト更新
  async updateProject(projectId: string, updates: any): Promise<void> {
    const query = `
      UPDATE \`universegeo_dataset.projects\`
      SET ${Object.keys(updates).map(key => `${key} = @${key}`).join(', ')},
          updated_at = CURRENT_TIMESTAMP()
      WHERE project_id = @projectId
    `;
    await bigquery.query({
      query,
      params: { projectId, ...updates },
    });
  }

  // 他のメソッドも同様に実装...
}

export const bqService = new BigQueryService();
```

#### 3. Express APIサーバーの実装

`backend/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import { bqService } from './bigquery-client';

const app = express();
app.use(cors());
app.use(express.json());

// プロジェクト一覧取得
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await bqService.getProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// プロジェクト作成
app.post('/api/projects', async (req, res) => {
  try {
    await bqService.createProject(req.body);
    res.status(201).json({ message: 'Project created' });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// その他のエンドポイント...

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### 4. Cloud Functionsとしてデプロイ

```bash
# Cloud Functionsにデプロイ
gcloud functions deploy universegeo-api \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region asia-northeast1 \
  --entry-point app \
  --set-env-vars GCP_PROJECT_ID=universegeo-project
```

---

## フロントエンドの接続

### 1. API URLの設定

`.env` に追加:

```env
VITE_API_BASE_URL=https://asia-northeast1-universegeo-project.cloudfunctions.net/universegeo-api
```

### 2. bigquery.ts の書き換え

`src/utils/bigquery.ts`:

```typescript
// 本番環境用の実装
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class BigQueryService {
  // プロジェクト取得
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/api/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  }

  // プロジェクト作成
  async createProject(project: Omit<Project, 'project_id'>): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  }

  // その他のメソッド...
}

export const bigQueryService = new BigQueryService();
```

### 3. 環境による切り替え

開発環境ではlocalStorage、本番環境ではBigQueryを使用：

```typescript
const USE_MOCK = import.meta.env.DEV; // 開発環境ではtrue

class BigQueryService {
  async getProjects(): Promise<Project[]> {
    if (USE_MOCK) {
      // localStorage版（既存のコード）
      return this.getProjectsFromLocalStorage();
    } else {
      // BigQuery版（新規実装）
      return this.getProjectsFromAPI();
    }
  }
}
```

---

## デプロイ方法

### バックエンドのデプロイ

```bash
# Cloud Runにデプロイ
cd backend
gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=universegeo-project
```

### フロントエンドのデプロイ

```bash
# API URLを設定してビルド
export VITE_API_BASE_URL=https://universegeo-backend-xxx.run.app
npm run build

# Cloud Runにデプロイ
.\deploy.ps1
```

---

## セキュリティ設定

### 1. サービスアカウントの作成

```bash
# サービスアカウントを作成
gcloud iam service-accounts create universegeo-sa \
  --display-name="UNIVERSEGEO Service Account"

# BigQueryの権限を付与
gcloud projects add-iam-policy-binding universegeo-project \
  --member="serviceAccount:universegeo-sa@universegeo-project.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

# キーファイルを作成
gcloud iam service-accounts keys create key.json \
  --iam-account=universegeo-sa@universegeo-project.iam.gserviceaccount.com
```

### 2. 認証の実装

APIエンドポイントに認証を追加：

```typescript
import { expressjwt } from 'express-jwt';

// JWTミドルウェア
app.use(expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  credentialsRequired: true,
}).unless({ path: ['/api/auth/login'] }));
```

---

## トラブルシューティング

### BigQueryエラー: 権限不足

```bash
# サービスアカウントの権限を確認
gcloud projects get-iam-policy universegeo-project
```

### API接続エラー: CORS

バックエンドで適切にCORSを設定：

```typescript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true,
}));
```

---

## コスト見積もり

### BigQueryの料金

- **ストレージ**: $0.020 per GB / 月
- **クエリ**: $5 per TB（最初の1TBは無料）
- **推定**: 小規模運用で月額 数百円〜数千円

### Cloud Runの料金

- **無料枠**: 月間200万リクエストまで無料
- **推定**: 小規模運用で月額 無料〜数百円

---

## 参考リンク

- [BigQuery クイックスタート](https://cloud.google.com/bigquery/docs/quickstarts)
- [Cloud Functions Node.js](https://cloud.google.com/functions/docs/create-deploy-nodejs)
- [Cloud Run デプロイ](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)








