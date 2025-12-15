# ジオコーディング実行タイミングの変更

## 変更概要

ジオコーディング（住所→緯度経度変換）の実行タイミングを**地点登録時**から**格納依頼時**に変更しました。

## 変更理由

### 1. コスト最適化
- 登録後に削除される地点の無駄なAPIコールを回避
- 実際に使用される地点のみをジオコーディング
- API利用料金を最小限に抑える

### 2. ユーザー体験の向上
- 地点登録がより高速に完了
- 大量の地点登録時の待ち時間を削減
- 必要なタイミングでまとめて処理

### 3. データ整合性
- 格納依頼時点での最終データを使用
- 編集された住所にも対応
- 一貫性のある処理フロー

## 変更内容

### 旧フロー
```
地点登録 → ジオコーディング → データ保存 → 格納依頼
```

### 新フロー
```
地点登録 → データ保存 → 格納依頼 → ジオコーディング → 格納処理
```

## 影響範囲

### 変更したファイル

#### 1. `/components/PoiBulkUpload.tsx`
**変更内容**:
- ジオコーディングステップを削除
- `autoGeocode` オプションを削除
- `geocoding` と `complete` ステップを削除
- プレビュー画面で「格納依頼時に自動取得」を表示

**Before**:
```typescript
type UploadStep = 'upload' | 'preview' | 'geocoding' | 'complete';
const [autoGeocode, setAutoGeocode] = useState(true);
const [geocodeProgress, setGeocodeProgress] = useState(0);
const [geocodeErrors, setGeocodeErrors] = useState<GeocodeError[]>([]);

// ジオコーディング実行
await enrichPOIsWithGeocode(parsedPois, ...);
```

**After**:
```typescript
type UploadStep = 'upload' | 'preview';
// ジオコーディング関連の状態を削除

// 直接登録（ジオコーディングはスキップ）
onUploadComplete(parsedPois);
```

#### 2. `/components/ProjectDetail.tsx`
**変更内容**:
- 格納依頼時にジオコーディングを実行
- 進捗表示ダイアログを追加
- エラーハンドリングを実装

**新規追加**:
```typescript
// ジオコーディング実行関数
const executeGeocoding = async (segment: Segment) => {
  // 該当セグメントの地点を取得
  const segmentPois = pois.filter(poi => poi.segment_id === segment.segment_id);
  
  // 緯度経度が未設定の地点を抽出
  const needsGeocoding = segmentPois.filter(
    poi => !poi.latitude || !poi.longitude
  );

  // ジオコーディング実行
  const { enriched, errors } = await enrichPOIsWithGeocode(
    segmentPois,
    (current, total) => {
      setGeocodeProgress(current);
      setGeocodeTotal(total);
    }
  );

  // 地点情報を更新
  enriched.forEach(poi => {
    if (poi.poi_id) {
      onPoiUpdate(poi.poi_id, {
        latitude: poi.latitude,
        longitude: poi.longitude,
      });
    }
  });

  // セグメントステータスを更新
  onSegmentUpdate(segment.segment_id, {
    location_request_status: 'storing'
  });
};
```

#### 3. `/components/GeocodeProgressDialog.tsx`
**新規作成**:
- ジオコーディング進捗を視覚的に表示
- 成功/エラー件数をリアルタイム表示
- エラー詳細を一覧表示
- 完了後に自動的に閉じる

**機能**:
- プログレスバー表示
- 成功/エラー統計
- エラー詳細リスト
- 処理中はダイアログを閉じられない

#### 4. `/components/SegmentTable.tsx`
**変更内容**:
- 格納依頼確認ダイアログのメッセージを更新
- ジオコーディング実行を明示

**Before**:
```
・管理部による地点データの抽出処理が開始されます
・ステータスが「格納対応中」に変更されます
・依頼後は地点の追加・編集・削除ができなくなります
```

**After**:
```
・住所から緯度経度を自動取得します（ジオコーディング）
・管理部による地点データの抽出処理が開始されます
・ステータスが「格納対応中」に変更されます
・依頼後は地点の追加・編集・削除ができなくなります

注意: ジオコーディング処理には数分かかる場合があります
```

#### 5. `/components/ui/dialog.tsx`
**変更内容**:
- `hideCloseButton` プロパティを追加
- 処理中にダイアログを閉じられないようにする

```typescript
function DialogContent({
  hideCloseButton,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  hideCloseButton?: boolean;
}) {
  // ...
  {!hideCloseButton && (
    <DialogPrimitive.Close>...</DialogPrimitive.Close>
  )}
}
```

#### 6. `/utils/geocoding.ts`
**変更内容**:
- キャッシュ機能を追加（コスト削減）
- 統計情報を追加（コスト監視）
- ログを強化

**新規追加**:
```typescript
// キャッシュシステム
const geocodeCache = new Map<string, GeocodeResult>();
let cacheHits = 0;
let cacheMisses = 0;

// 統計情報取得
export function getGeocodeStats() { ... }
export function logGeocodeStats() { ... }
export function clearGeocodeCache() { ... }

// コスト計算
function calculateEstimatedCost(apiCalls: number): number { ... }
```

### 変更しなかったファイル

#### `/components/PoiForm.tsx`
**理由**: 手動ジオコーディング機能は残す
- ユーザーが手動で緯度経度を取得したい場合に対応
- 個別の地点登録時の利便性を維持

## ユーザー体験の変化

### 地点登録時（CSV一括登録）

#### Before
1. CSVファイルをアップロード
2. プレビュー画面で確認
3. **ジオコーディング実行（数分待機）**
4. 完了画面で確認
5. 登録ボタンをクリック

#### After
1. CSVファイルをアップロード
2. プレビュー画面で確認
3. 登録ボタンをクリック ← **即座に完了**

### 格納依頼時

#### Before
1. 格納依頼ボタンをクリック
2. 確認ダイアログで確認
3. ステータスが「格納対応中」に変更

#### After
1. 格納依頼ボタンをクリック
2. 確認ダイアログで確認（ジオコーディング実行を明示）
3. **ジオコーディング進捗ダイアログが表示**
4. 完了後、ステータスが「格納対応中」に変更

## メリット

### 1. コスト削減効果

| シナリオ | 旧方式 | 新方式 | 削減率 |
|---------|--------|--------|--------|
| 100件登録→50件削除→格納依頼 | 100 API calls | 50 API calls | **50%削減** |
| 1000件登録→200件使用→格納依頼 | 1000 API calls | 200 API calls | **80%削減** |

### 2. パフォーマンス向上

- CSV一括登録が**数分→数秒**に短縮
- 大量登録時のユーザー待ち時間を大幅削減
- システムリソースの効率的な利用

### 3. データ品質向上

- 最終的な住所データでジオコーディング
- 編集後のデータに対応
- エラー時の再試行が容易

## 注意事項

### 1. 格納依頼時の待ち時間

- ジオコーディング処理に数分かかる場合がある
- 進捗ダイアログで状況を明示
- 処理中は画面を閉じないよう注意喚起

### 2. エラーハンドリング

- 一部の地点でエラーが発生しても処理を継続
- エラー詳細を表示
- エラーの地点は緯度経度が未設定のまま

### 3. キャッシュの有効期限

- ブラウザをリロードするとキャッシュがクリア
- 本番環境では Redis などの利用を推奨

## 今後の拡張可能性

### 1. バッチ処理の最適化

```typescript
// 重複住所の事前除去
const uniqueAddresses = [...new Set(pois.map(poi => poi.address))];

// 並列処理
await Promise.all(uniqueAddresses.map(addr => geocodeAddress(addr)));
```

### 2. エラーリトライ機能

```typescript
// 失敗した地点のみ再試行
const failedPois = errors.map(e => e.address);
await retryGeocoding(failedPois);
```

### 3. 手動修正UI

```typescript
// エラーの地点を手動で修正
<GeocodeErrorEditor errors={errors} onFix={handleManualFix} />
```

## 参考ドキュメント

- `/GEOCODING_README.md` - ジオコーディング利用ガイド
- `/docs/GEOCODING_SETUP.md` - 本番環境セットアップ手順
- `/utils/geocoding.ts` - ジオコーディング実装
- `/components/GeocodeProgressDialog.tsx` - 進捗表示UI

---

**変更日**: 2024年11月18日  
**影響範囲**: 地点登録フロー、格納依頼フロー  
**互換性**: 既存データには影響なし
