# UNIVERSEGEO 技術スタック・設計ドキュメント

**最終更新日:** 2026年1月28日  
**目的:** 本ツールで利用している言語・フレームワーク・アーキテクチャ・設計方針を一覧にまとめる。

---

## 目次

1. [使用言語](#使用言語)
2. [技術スタック一覧](#技術スタック一覧)
3. [プロジェクト構成](#プロジェクト構成)
4. [アーキテクチャ](#アーキテクチャ)
5. [フロントエンド設計](#フロントエンド設計)
6. [バックエンド設計](#バックエンド設計)
7. [データ層・ID設計](#データ層id設計)
8. [関連ドキュメント](#関連ドキュメント)

---

## 使用言語

| 対象 | 言語 | 備考 |
|------|------|------|
| **フロントエンド** | TypeScript | 厳格な型付け。`.ts` / `.tsx`（React） |
| **バックエンド** | TypeScript | Node.js 上で実行。`backend/src` はすべて `.ts` |
| **スタイル** | CSS + Tailwind CSS | `index.css`、Tailwind ユーティリティクラス。PostCSS 使用 |
| **設定・ビルド** | JavaScript / TypeScript | `vite.config.ts`, `tailwind.config.js`, `postcss.config.js` 等 |
| **ドキュメント** | Markdown | `docs/`, `src/docs/` |
| **CI/CD** | YAML | GitHub Actions (`.github/workflows/`) |

**共通方針:** アプリケーション本体は **TypeScript のみ** で記述し、JavaScript は設定ファイルに限定している。

---

## 技術スタック一覧

### フロントエンド

| カテゴリ | 技術 | バージョン目安 | 用途 |
|----------|------|----------------|------|
| ランタイム・ビルド | Node.js | 18+ | 開発・ビルド環境 |
| フレームワーク | React | 18.x | UI ライブラリ |
| 言語・トランスパイル | TypeScript | (Vite に同梱) | 型付きJS |
| ビルドツール | Vite | 6.x | 開発サーバー・本番ビルド。SWC 使用 (`@vitejs/plugin-react-swc`) |
| UI コンポーネント | Radix UI | 各パッケージ別 | アクセシブルなプリミティブ（Dialog, Tabs, Select 等） |
| スタイリング | Tailwind CSS | 4.x | ユーティリティファーストCSS。PostCSS 経由 |
| フォーム | react-hook-form | 7.x | フォーム状態・バリデーション |
| 日付 | date-fns, react-day-picker | - | 日付表示・日付ピッカー |
| 地図 | Leaflet / Google Maps API | - | 地図表示・ポリゴン選択（API キー設定で切り替え可能） |
| 表・グラフ | recharts | 2.x | チャート表示 |
| Excel | ExcelJS, xlsx | - | Excel テンプレート生成・一括読み込み |
| アイコン | lucide-react | - | アイコンコンポーネント |
| その他 UI | class-variance-authority, clsx, tailwind-merge, sonner, vaul 等 | - | スタイル制御・トースト・ドロワー等 |

### バックエンド

| カテゴリ | 技術 | バージョン目安 | 用途 |
|----------|------|----------------|------|
| ランタイム | Node.js | 18+ | サーバー実行 |
| 言語 | TypeScript | 5.x | 型付き実装。ts-node で開発時実行 |
| Web フレームワーク | Express | 4.x | REST API サーバー |
| CORS | cors | 2.x | クロスオリジン許可 |
| 環境変数 | dotenv | 16.x | `.env` 読み込み |
| データベース | Google BigQuery | @google-cloud/bigquery 7.x | 永続化層。GCP プロジェクト・データセット指定 |
| メール送信 | SendGrid | @sendgrid/mail 8.x | パスワードリセット等（要設定） |
| Google API | googleapis | 128.x | Sheets 連携等 |

### インフラ・デプロイ

| カテゴリ | 技術 | 用途 |
|----------|------|------|
| コンテナ | Docker | 本番ビルド・Cloud Run 用イメージ |
| Web サーバー | nginx | 本番の静的配信・リバースプロキシ |
| CI/CD | GitHub Actions | ビルド・デプロイ（dev/prod ワークフロー） |
| ホスティング | Cloud Run（推奨）, Netlify, Vercel, Firebase Hosting | フロント・バックのデプロイ先 |

---

## プロジェクト構成

```
UNIVERSEGEO_backup/
├── src/                    # フロントエンド（React SPA）
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/         # React コンポーネント
│   ├── contexts/          # React Context（認証等）
│   ├── hooks/             # カスタムフック（案件・セグメント・POI 等）
│   ├── types/             # 型定義（schema.ts, auth.ts）
│   ├── utils/             # ユーティリティ（bigquery.ts, geocoding, Excel, Sheets 等）
│   ├── docs/              # フロント寄り仕様・デバッグドキュメント
│   └── index.css / styles/
├── backend/               # バックエンド（Node.js + Express）
│   └── src/
│       ├── index.ts       # Express アプリ・ルート定義
│       ├── bigquery-client.ts  # BigQuery 操作の集約
│       └── middleware/     # 認証・エラーハンドリング・リクエストコンテキスト
├── config/
│   ├── dev/               # 開発用 Vite/backend 設定
│   └── prod/              # 本番用 Vite/backend 設定
├── docs/                  # プロジェクト全体ドキュメント
│   ├── shared/            # 共通（本ドキュメント、BQ 定義、デプロイ等）
│   ├── dev/               # 開発環境
│   └── prod/              # 本番環境
├── scripts/               # ビルド・デプロイ用スクリプト
├── package.json           # フロントエンド依存関係
├── backend/package.json   # バックエンド依存関係
├── vite.config.ts
├── tailwind.config.js
└── Dockerfile
```

- **フロントとバックは別パッケージ**: ルート `package.json` がフロント、`backend/package.json` がバックエンド。モノレポのサブパッケージ構成ではない。
- **環境別設定**: `config/dev` と `config/prod` で Vite やバックエンド設定を切り替え。

---

## アーキテクチャ

### 全体像

- **フロント**: 単一ページアプリケーション（SPA）。React が DOM を担当し、Vite でバンドルされた静的ファイル（HTML/JS/CSS）を配信。
- **バックエンド**: REST API（Express）。BigQuery への読み書きを担当。CORS でフロントのオリジンを許可。
- **データの流れ**:  
  - 本番: フロント → HTTP（fetch）→ バックエンド API → BigQuery  
  - 開発・API 未設定時: フロント内の `src/utils/bigquery.ts` が **localStorage ベースのモック** で動作（BigQuery は使わない）。

### フロントとバックの接続条件

- フロントでは `VITE_API_BASE_URL` がビルド時に埋め込まれる。
- この値が設定されている場合のみ、**一部リソース**（プロジェクト取得・作成、ユーザー、ユーザー登録申請、パスワードリセット、スプレッドシートエクスポート）でバックエンド API を呼ぶ。
- **セグメント・POI・メッセージ・プロジェクト更新・削除などは、現状フロントに API 呼び出しが未実装**で、本番でも localStorage のみを使用する。  
  → 詳細: [PRODUCTION_API_CONNECTION_STATUS.md](troubleshooting/PRODUCTION_API_CONNECTION_STATUS.md)

---

## フロントエンド設計

### 状態管理

- **グローバル状態**: React Context（`AuthContext`）で認証状態を保持。
- **案件・セグメント・POI**: カスタムフック `useProjectSystem` で取得・作成・更新・削除を集約し、内部で `src/utils/bigquery.ts` のサービスを呼ぶ。
- **サーバー状態のキャッシュ**: 現状は React Query 等は使っておらず、必要なタイミングで API または localStorage から再取得する方式。

### データアクセス層

- **`src/utils/bigquery.ts`**: プロジェクト・セグメント・POI・メッセージ・ユーザー・申請・履歴等の「データ取得・更新」を一括して提供するクラス。
  - `VITE_API_BASE_URL` が無い場合: すべて **localStorage** でモック。
  - ある場合: **プロジェクト（get/create）・ユーザー・申請・パスワードリセット** のみ API を呼び、それ以外は引き続き localStorage。
- **`src/utils/googleSheets.ts`**: スプレッドシートエクスポート。`VITE_API_BASE_URL` 設定時はバックエンドのエクスポート API を利用。

### UI 設計

- **コンポーネント**: Radix UI をベースに、Tailwind で見た目を調整。ShadcnUI 風の利用を想定した構成。
- **スタイル**: Tailwind のユーティリティクラスを中心にし、必要に応じて `index.css` やコンポーネント内のクラスで拡張。
- **デザイン元**: Figma のオリジナルデザインを参照（README にリンクあり）。

### ルーティング

- SPA 内の画面切り替えは、状態（選択案件・タブ等）に応じてコンポーネントを出し分けする方式。React Router 等の URL ルーティングは、現状の構成では未使用または限定的。

---

## バックエンド設計

### API 設計

- **スタイル**: REST。JSON のやりとり。認証はセッションまたはトークン方式（実装は `AuthContext` 等と連携）。
- **エンドポイント例**:
  - プロジェクト: `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:project_id`
  - セグメント: `GET/POST /api/segments`, `GET /api/segments/project/:project_id`, `PUT /api/segments/:segment_id`
  - POI: `GET/POST /api/pois`, `GET /api/pois/project/:project_id`, `POST /api/pois/bulk`, `PUT/DELETE /api/pois/:poi_id`
  - メッセージ: `GET/POST /api/messages`, `GET /api/messages/:project_id`, `POST /api/messages/mark-read`
  - ユーザー・申請・パスワードリセット・スプレッドシートエクスポート用のルートあり。
- **一覧**: 起動時のルート一覧は `GET /` の `endpoints` で確認可能。

### BigQuery との対応

- **`backend/src/bigquery-client.ts`**: すべての BigQuery アクセスを集約。テーブル名・データセットは環境変数（`GCP_PROJECT_ID`, `BQ_DATASET`）で指定。
- **テーブル定義**: スキーマ・フィールド・リレーションは [BIGQUERY_TABLE_DEFINITIONS.md](BIGQUERY_TABLE_DEFINITIONS.md) に記載。

### ミドルウェア

- **request-context**: リクエストごとの相関ID等を付与。
- **async-wrapper**: 非同期ルートの例外を捕捉。
- **error-handler**: 共通エラーレスポンス処理。

---

## データ層・ID設計

### 主キー・採番

- **案件（project_id）**: バックエンドで採番。形式は連番ベース（例: `PRJ-1`）。フロントのモックでは `PRJ-{連番}` 等。
- **セグメント（segment_id）**:  
  - バックエンドで採番する場合は `SEG-{連番}` を想定（ドキュメント上の例）。  
  - **フロントのモックでは** 配信媒体に応じて `seg-uni-{3桁}`（Universe）または `seg-ctv-{3桁}`（TVer CTV）を採番。本番は現状セグメントが API 未接続のため、この形式がフロントのみで使われる。
- **地点（poi_id）**: バックエンドまたはフロントのモックで一意になるよう採番。`location_id` は TG 地点で `TG-{segment_id}-{連番}` 等のルールあり（BIGQUERY_TABLE_DEFINITIONS 参照）。

### データの二重化（本番の注意点）

- 本番で `VITE_API_BASE_URL` を設定しても、**セグメント・POI・メッセージ・プロジェクト更新・削除** はフロントから API が呼ばれず、**localStorage のみ**に保存される。
- そのため「案件一覧は BigQuery、その下のセグメント・地点はブラウザごとの localStorage」という状態になり得る。API 接続状況の詳細は [PRODUCTION_API_CONNECTION_STATUS.md](troubleshooting/PRODUCTION_API_CONNECTION_STATUS.md) を参照。

---

## 関連ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [README.md](../../README.md) | プロジェクト概要・クイックスタート・技術スタック要約 |
| [src/docs/SYSTEM_SPECIFICATION.md](../../src/docs/SYSTEM_SPECIFICATION.md) | システム仕様・画面・ロール・業務フロー |
| [BIGQUERY_TABLE_DEFINITIONS.md](BIGQUERY_TABLE_DEFINITIONS.md) | BigQuery テーブル定義・本番API接続の注記 |
| [PRODUCTION_API_CONNECTION_STATUS.md](troubleshooting/PRODUCTION_API_CONNECTION_STATUS.md) | 本番で API 接続済み/未接続の一覧 |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | デプロイ手順 |
| [docs/shared/README.md](README.md) | 共通ドキュメントの索引 |

---

**本ドキュメントは「このツールで利用している言語・技術・設計」を一括で参照するためのものです。** 機能要件や画面仕様は `SYSTEM_SPECIFICATION.md`、データスキーマは `BIGQUERY_TABLE_DEFINITIONS.md` を参照してください。
