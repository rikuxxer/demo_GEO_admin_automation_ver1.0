# データセットを先に作成する（必須）

エラー: **`Dataset universe-geo-admin-dev-12246:universegeo_dataset was not found in location US`**

このエラーは次のどちらかで出ます。

1. **データセットがまだ存在しない** → データセットを **US** で作成する。
2. **データセットが別リージョン（例: 東京）にある** → コンソールやクエリが **US** で実行されているため見つからない。データセットを **US** で作り直すか、バックエンドの `BQ_LOCATION` を合わせる。

テーブル作成SQL（`create_all_tables.sql`）を実行する**前**に、必ずデータセットを作成してください。**ロケーションは US に統一**すると、コンソールとバックエンドの両方で同じデータセットを参照できます。

---

## 方法1: コマンドライン（bq）で作成

### 1. プロジェクトを指定してログイン

```bash
gcloud config set project universe-geo-admin-dev-12246
gcloud auth application-default login
```

### 2. データセットを US ロケーションで作成

```bash
bq mk --dataset --location=US universe-geo-admin-dev-12246:universegeo_dataset
```

成功すると何も表示されません。

### 3. 作成されたか確認

```bash
bq ls universe-geo-admin-dev-12246:
```

一覧に `universegeo_dataset` が出ていればOKです。

### 4. テーブル作成SQLを実行

BigQuery コンソールで「クエリを作成」→ `create_all_tables.sql` の内容を貼り付けて実行するか、以下で実行します。

```bash
bq query --use_legacy_sql=false --project_id=universe-geo-admin-dev-12246 < docs/scripts/create_all_tables.sql
```

---

## 方法2: Google Cloud コンソール（Web）で作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 左上のプロジェクト選択で **universe-geo-admin-dev-12246** を選択
3. メニュー → **BigQuery** を開く
4. 左ペインの「プロジェクト名」の横にある **⋮（縦三点）** → **データセットを作成**
5. 次のように入力:
   - **データセットID**: `universegeo_dataset`
   - **ロケーション**: **米国 (US)** を選択（「マルチリージョン」の「米国」）
6. **データセットを作成** をクリック
7. 作成後、`create_all_tables.sql` の内容を「クエリを作成」で実行

---

## よくある原因

| 状況 | 対処 |
|------|------|
| プロジェクトが違う | `gcloud config set project universe-geo-admin-dev-12246` で切り替え |
| 権限がない | プロジェクトのオーナーまたは「BigQuery データセット作成」権限を持つアカウントで実行 |
| ロケーションが違う | コンソールでクエリを実行している場合、データセット作成時に選んだロケーション（US など）と同じリージョンのコンソール／API を使う |

データセットを US で作成したら、以降のテーブル作成・クエリはそのデータセットに対して実行してください。

---

## バックエンド（Cloud Run / ローカル）で同じデータセットを使う場合

バックエンドはデフォルトで `BQ_LOCATION=asia-northeast1`（東京）を指定しています。データセットを **US** で作成した場合は、バックエンドの環境変数で **US** を指定してください。そうしないと「Dataset was not found in location asia-northeast1」になります。

- **Cloud Run**: サービス編集 → 変数とシークレット → `BQ_LOCATION` = `US` を追加
- **ローカル (.env)**: `BQ_LOCATION=US` を追加

これでデータセット（US）とバックエンドのロケーションが一致し、エラーが解消されます。
