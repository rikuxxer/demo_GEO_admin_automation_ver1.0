# 本番環境におけるフロントエンドAPI接続状況

**最終更新日:** 2026年1月28日  
**対象:** 本番環境（`VITE_API_BASE_URL` が設定されたビルド）で、フロントエンド `src/utils/bigquery.ts` がバックエンドAPIを呼び出しているかどうかの一覧。

---

## 概要

**すべてのAPI接続が完了しています。**  
プロジェクト・セグメント・POI・メッセージ・ユーザーに加え、編集依頼・来店計測地点グループ・機能リクエスト・変更履歴も、フロントの `USE_API` 分岐でバックエンドAPI（→ BigQuery）を利用します。本番で `VITE_API_BASE_URL` を設定すれば、すべてのデータが永続的にバックエンドに保存・取得されます。

---

## 接続済み（本番でバックエンドAPI → BigQuery を使用）

| リソース | メソッド | フロントのAPI分岐 | バックエンドエンドポイント | 備考 |
|----------|----------|-------------------|----------------------------|------|
| **プロジェクト** | `getProjects()`, `createProject()`, `updateProject()`, `deleteProject()` | ✅ USE_API | `GET/POST/PUT/DELETE /api/projects` | 全CRUD接続済み |
| **セグメント** | `getSegments()`, `getSegmentsByProject()`, `createSegment()`, `updateSegment()`, `deleteSegment()`, `requestSegmentEdit()`, `deleteSegmentsByProject()` | ✅ USE_API | `GET/POST/PUT/DELETE /api/segments` | 全CRUD接続済み |
| **地点（POI）** | `getPoiInfos()`, `getPoisByProject()`, `getPoisBySegment()`, `createPoi()`, `createPoisBulk()`, `createPoiInfo()`, `updatePoi()`, `deletePoi()`, `deletePoiBySegment()`, `deletePoiByProject()` | ✅ USE_API | `GET/POST/PUT/DELETE /api/pois` | 全CRUD接続済み |
| **メッセージ** | `getProjectMessages()`, `getAllMessages()`, `sendProjectMessage()`, `markMessagesAsRead()` | ✅ USE_API | `GET/POST /api/messages`, `POST /api/messages/mark-read` | 接続済み |
| **ユーザー** | `getUsers()`, `createUser()`, `updateUser()`, `deleteUser()` | ✅ USE_API | `GET/POST/PUT/DELETE /api/users` | 全CRUD接続済み |
| **ユーザー登録申請** | `getUserRequests()`, `createUserRequest()`, `approveUserRequest()`, `rejectUserRequest()` | ✅ USE_API | `GET/POST /api/user-requests`, `POST .../approve`, `.../reject` | 接続済み |
| **パスワードリセット** | `requestPasswordReset()`, `resetPassword()` | ✅ USE_API | `POST /api/password-reset/request`, `.../reset` | 接続済み |
| **編集依頼** | `getEditRequests()`, `createEditRequest()`, `updateEditRequest()`, `deleteEditRequest()` | ✅ USE_API | `GET/POST/PUT/DELETE /api/edit-requests` | 全CRUD接続済み |
| **来店計測地点グループ** | `getVisitMeasurementGroups()`, `createVisitMeasurementGroup()`, `updateVisitMeasurementGroup()`, `deleteVisitMeasurementGroup()` | ✅ USE_API | `GET /api/visit-measurement-groups/project/:project_id`, `POST/PUT/DELETE /api/visit-measurement-groups` | 全CRUD接続済み |
| **機能リクエスト** | `getFeatureRequests()`, `createFeatureRequest()`, `updateFeatureRequest()` | ✅ USE_API | `GET/POST/PUT /api/feature-requests` | 接続済み |
| **変更履歴** | `recordChangeHistory()`（内部）, `getChangeHistories()` | ✅ USE_API | `GET/POST /api/change-history` | 接続済み |

※ スプレッドシートエクスポート（`src/utils/googleSheets.ts`）も `VITE_API_BASE_URL` 設定時はバックエンドAPIを使用。

---

## 補足: getProject(projectId)

- `getProject(projectId)` は内部で `getProjects()` を呼ぶため、**USE_API 時は API 経由で取得した一覧から該当 project を返す**。プロジェクトの取得・作成・更新・削除はすべて本番でAPI接続済み。

---

## 本番環境でのデータの流れ（2026年1月28日・全接続完了後）

| データ | 取得 | 作成 | 更新 | 削除 |
|--------|------|------|------|------|
| プロジェクト | ✅ API | ✅ API | ✅ API | ✅ API |
| セグメント | ✅ API | ✅ API | ✅ API | ✅ API |
| 地点（POI） | ✅ API | ✅ API | ✅ API | ✅ API |
| メッセージ | ✅ API | ✅ API | ✅ API（既読） | - |
| ユーザー | ✅ API | ✅ API | ✅ API | ✅ API |
| ユーザー登録申請・パスワードリセット | ✅ API | ✅ API | ✅ API（承認・却下等） | - |
| 編集依頼 | ✅ API | ✅ API | ✅ API | ✅ API |
| 来店計測地点グループ | ✅ API | ✅ API | ✅ API | ✅ API |
| 機能リクエスト | ✅ API | ✅ API | ✅ API | - |
| 変更履歴 | ✅ API | ✅ API | - | - |

---

## 本番環境での確認（重要）

**重要なのは本番環境でAPIが正しく動いているかです。** ローカルは参考程度にし、デプロイ後に本番URLで以下を実行して確認してください。

### 1. 本番バックエンドURLの取得

- **Cloud Run**: GCP コンソールの Cloud Run → 該当サービス → URL をコピー  
  または:
  ```bash
  gcloud run services describe universegeo-backend --region asia-northeast1 --format='value(status.url)'
  ```
- **GitHub Actions**: デプロイログの「Backend deployed to:」の後のURL
- 例: `https://universegeo-backend-i5xw76aisq-an.a.run.app`（実際の本番URLは Cloud Run で確認）

### 2. 本番で接続テスト（全エンドポイント応答確認）

本番URLを **実際のURL** に置き換えて実行してください。

```bash
node scripts/test-api-endpoints.js https://本番バックエンドの実際のURL
```

PowerShell の例:

```powershell
node scripts/test-api-endpoints.js https://universegeo-backend-i5xw76aisq-an.a.run.app
```

成功時: 各エンドポイントが `200` などで表示され、「全 15 エンドポイントが応答しました」と出れば本番接続は問題ありません。

### 3. 本番で全カラム接続確認（レスポンスの必須カラム検証）

本番でデータが入っているリソースについて、必須カラムが返っているかを確認します。

```bash
node scripts/validate-api-columns.js https://本番バックエンドの実際のURL
```

PowerShell の例:

```powershell
node scripts/validate-api-columns.js https://universegeo-backend-i5xw76aisq-an.a.run.app
```

- 接続・形式OK かつ「データありでカラム検証済み」のエンドポイントで必須カラムが揃っていれば、本番のカラム接続は問題ありません。
- データが0件のエンドポイントは「0件のためスキップ」となり、本番でデータを登録した後に再実行するとカラム検証されます。

### 4. 注意

- 本番URLは Cloud Run のサービスごとに異なります。上記は現在の本番例（`universegeo-backend-i5xw76aisq-an.a.run.app`）です。再デプロイで変わる場合は Cloud Run で確認してください。
- 本番URLが分からない場合は、Cloud Run のサービス一覧またはデプロイ履歴で確認してください。

---

## API接続テストの実行（ローカル用）

ローカルでバックエンドを起動したうえで、`scripts/test-api-endpoints.js` を実行できます（本番確認が優先です）。

```bash
node scripts/test-api-endpoints.js http://localhost:8080
```

---

## 参照

- フロント: `src/utils/bigquery.ts`（`USE_API`, `API_BASE_URL`）
- バックエンド: `backend/src/index.ts`（各 `/api/*` ルート）
- テーブル定義: `docs/shared/BIGQUERY_TABLE_DEFINITIONS.md`
