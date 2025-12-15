# Geocoding API 本番環境セットアップガイド

## 概要

UNIVERSEGEOでは、住所から緯度経度を取得するためにGoogle Maps Geocoding APIを使用します。
開発環境ではモックデータを使用しますが、本番環境では実際のAPIキーが必要です。

## 開発環境 vs 本番環境

| 項目 | 開発環境 | 本番環境 |
|------|---------|----------|
| APIキー | 不要 | **必須** |
| データ精度 | 推定座標（±2-10km） | 正確な座標 |
| コスト | 無料 | 従量課金 |
| レート制限 | なし | あり（50req/秒） |
| 実装ファイル | `geocodeAddressMock()` | `geocodeAddressAPI()` |

## Google Maps Geocoding API セットアップ手順

### 1. Google Cloud Platform プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新規プロジェクトを作成または既存プロジェクトを選択
3. プロジェクト名: `universegeo-production` （任意）

### 2. Geocoding API の有効化

1. ナビゲーションメニュー → **APIとサービス** → **ライブラリ**
2. "Geocoding API" を検索
3. **有効にする** をクリック

### 3. APIキーの作成

1. **APIとサービス** → **認証情報**
2. **認証情報を作成** → **APIキー**
3. APIキーが生成される（例: `AIzaSyD...`）

### 4. APIキーの制限設定（セキュリティ対策）

#### アプリケーションの制限
- **HTTPリファラー** を選択
- 許可するドメインを追加:
  ```
  https://your-domain.com/*
  https://*.your-domain.com/*
  ```

#### API の制限
- **キーを制限** を選択
- **Geocoding API** のみを選択

### 5. 環境変数の設定

#### Vercel/Netlifyなどのホスティング環境

```bash
# 環境変数
GOOGLE_MAPS_API_KEY=AIzaSyD...your-actual-key...
```

#### ローカル開発環境（.env.local）

```bash
# .env.local
GOOGLE_MAPS_API_KEY=AIzaSyD...your-actual-key...
```

**⚠️ 注意**: `.env.local` ファイルはGitにコミットしないでください

### 6. 実装の確認

環境変数が正しく設定されると、`/utils/geocoding.ts` が自動的にAPIモードに切り替わります：

```typescript
const USE_MOCK_DATA = !process.env.GOOGLE_MAPS_API_KEY || 
                       process.env.GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE';
```

## 料金体系（2024年時点）

### Google Maps Geocoding API 料金

| 利用量（月間） | 料金 |
|---------------|------|
| 0 - 40,000 リクエスト | **$0** (無料枠) |
| 40,001 - 100,000 | $5.00 / 1,000リクエスト |
| 100,001 - 500,000 | $4.00 / 1,000リクエスト |
| 500,001+ | $3.50 / 1,000リクエスト |

**無料枠**: 毎月 $200 のクレジット = **40,000リクエスト/月 無料**

### コスト試算例

#### シナリオ1: 小規模利用（月間5,000件の地点登録）
- 新規地点登録: 5,000リクエスト/月
- **コスト**: $0（無料枠内）

#### シナリオ2: 中規模利用（月間50,000件の地点登録）
- 新規地点登録: 50,000リクエスト/月
- 無料枠: 40,000リクエスト
- 有料分: 10,000リクエスト × $5.00/1,000 = **$50/月**

#### シナリオ3: 大規模利用（月間200,000件の地点登録）
- 200,000リクエスト/月
- 0-40,000: 無料
- 40,001-100,000: 60,000 × $5.00/1,000 = $300
- 100,001-200,000: 100,000 × $4.00/1,000 = $400
- **合計**: $700/月

## レート制限

Google Maps Geocoding APIのレート制限：
- **50 リクエスト/秒**
- **1,000,000 リクエスト/日** （標準）

### UNIVERSEGEOでの対策

`/utils/geocoding.ts` には既にレート制限対策を実装済み：

```typescript
// レート制限対策（Google Maps APIは1秒あたり50リクエストまで）
if (!USE_MOCK_DATA && i < addresses.length - 1) {
  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機
}
```

- CSV一括登録時: 100ms間隔で順次処理
- 実効速度: 約10リクエスト/秒（安全マージン）

## コスト最適化の推奨事項

### 1. キャッシュの活用

同じ住所に対するリクエストを避けるため、結果をデータベースに保存：

```typescript
// 既に取得済みの住所はスキップ
if (poi.latitude && poi.longitude) {
  continue; // ジオコーディング不要
}
```

### 2. バッチ処理の最適化

- 必要な地点のみをジオコーディング
- 重複住所を事前に除去

### 3. 手動入力の併用

- 重要な地点は手動で緯度経度を入力
- APIコールを削減

## 代替案の検討

### Option 1: 無料のジオコーディングサービス

#### OpenStreetMap Nominatim
- **料金**: 完全無料
- **制限**: 1リクエスト/秒
- **精度**: Google Mapsより低い場合がある

#### 実装例
```typescript
async function geocodeWithNominatim(address: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(address)}&format=json&limit=1`
  );
  const data = await response.json();
  if (data.length > 0) {
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      formattedAddress: data[0].display_name,
    };
  }
}
```

### Option 2: 自社ジオコーディングDBの構築

- 日本郵便の郵便番号データ（無料）
- 国土地理院の位置参照情報（無料）
- 初期構築コストは高いが、運用コストは最小

### Option 3: ハイブリッド方式

1. まず無料サービスで試行
2. 失敗した場合のみGoogle Maps APIを使用
3. コストを大幅削減

## トラブルシューティング

### APIキーが認識されない

```typescript
// デバッグ用コード
console.log('API Key:', process.env.GOOGLE_MAPS_API_KEY ? '設定済み' : '未設定');
console.log('Using Mock Data:', USE_MOCK_DATA);
```

### エラー: "REQUEST_DENIED"

- APIキーが無効
- Geocoding APIが有効化されていない
- APIキーの制限設定を確認

### エラー: "OVER_QUERY_LIMIT"

- レート制限超過
- 待機時間を増やす（100ms → 200ms）
- リクエスト数を削減

### エラー: "ZERO_RESULTS"

- 住所が不正確
- フォーマットを確認（例: 「東京都」を必ず含める）

## 監視とアラート

### Google Cloud Consoleでの監視

1. **APIとサービス** → **ダッシュボード**
2. Geocoding APIの使用状況を確認
3. アラートを設定（例: 月間$50超過時）

### 推奨アラート設定

- 日次リクエスト数が10,000を超えた場合
- 月間コストが予算を超過した場合
- エラー率が5%を超えた場合

## まとめ

### 推奨構成

| 環境 | ジオコーディング方法 | 理由 |
|------|---------------------|------|
| 開発環境 | モックデータ | コスト削減、API不要 |
| ステージング | Google Maps API（テストキー） | 本番環境のテスト |
| 本番環境 | Google Maps API（本番キー） | 正確性とサポート |

### チェックリスト

- [ ] Google Cloud Platformプロジェクト作成
- [ ] Geocoding API有効化
- [ ] APIキー作成と制限設定
- [ ] 環境変数設定
- [ ] 動作確認（テストデータで）
- [ ] コスト監視アラート設定
- [ ] 月次レビュープロセス確立

### サポート

- Google Maps Platform サポート: https://developers.google.com/maps/support
- 料金計算ツール: https://mapsplatformtransition.withgoogle.com/calculator
