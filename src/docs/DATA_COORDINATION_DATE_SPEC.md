# データ連携目途 自動計算機能 仕様書

## 概要
格納依頼のタイミングで、データ連携目途を自動計算してセグメントに保存する機能。

## ビジネスルール

### 基本ルール
1. **20:00以降の依頼は翌日扱い**
   - 20:00以降に格納依頼を行った場合、翌日を基準日として計算する

2. **依頼日から次の月・水・金を探す**
   - 基準日から最も近い将来の月・水・金を見つける

3. **曜日による計算ロジックの違い**
   - **月・水・金に依頼した場合**: 次の月・水・金をそのまま返す
   - **その他の曜日（火・木・土・日）に依頼した場合**: 次の月・水・金 + 1営業日

4. **営業日の定義**
   - 営業日は月曜日〜金曜日（土日は除外）

### 制約事項
- 月・水・金の依頼は当日20時までに制限
- その他の曜日（火・木・土・日）は時間制限なし

## 計算例

### ケース1: 月曜日15時に依頼
```
入力: 2024年11月18日（月）15:00
計算: 月曜日 → 次の月・水・金は水曜日（11/20）
結果: 2024年11月20日（水）
```

### ケース2: 火曜日10時に依頼
```
入力: 2024年11月19日（火）10:00
計算: 火曜日 → 次の月・水・金は水曜日（11/20）→ +1営業日 = 木曜日（11/21）
結果: 2024年11月21日（木）
```

### ケース3: 月曜日21時に依頼（翌日扱い）
```
入力: 2024年11月18日（月）21:00
計算: 20時以降のため翌日11/19（火）扱い
      → 次の月・水・金は水曜日（11/20）→ +1営業日 = 木曜日（11/21）
結果: 2024年11月21日（木）
```

### ケース4: 金曜日19時に依頼
```
入力: 2024年11月22日（金）19:00
計算: 金曜日 → 次の月・水・金は月曜日（11/25）
結果: 2024年11月25日（月）
```

### ケース5: 水曜日14時に依頼
```
入力: 2024年11月20日（水）14:00
計算: 水曜日 → 次の月・水・金は金曜日（11/22）
結果: 2024年11月22日（金）
```

### ケース6: 木曜日16時に依頼
```
入力: 2024年11月21日（木）16:00
計算: 木曜日 → 次の月・水・金は金曜日（11/22）→ +1営業日 = 月曜日（11/25）
結果: 2024年11月25日（月）
```

## 実装

### ファイル構成

#### 1. `/utils/dataCoordinationDate.ts`
計算ロジックを実装したユーティリティ関数

**主要な関数:**
- `calculateDataCoordinationDate(requestDateTime: string): string`
  - 格納依頼日時からデータ連携目途を計算
  - 戻り値: YYYY-MM-DD形式の日付文字列

- `formatDateToMMDD(dateString: string): string`
  - YYYY-MM-DD形式をMM/DD形式に変換（表示用）

#### 2. `/types/schema.ts`
Segmentインターフェースに`data_coordination_date`フィールドを追加

```typescript
export interface Segment {
  // ... 既存のフィールド
  data_coordination_date?: string; // データ連携目途（格納依頼日から自動計算）
}
```

#### 3. `/components/ProjectDetail.tsx`
格納依頼時にデータ連携目途を計算して保存

```typescript
// 格納依頼日時を取得し、データ連携目途を計算
const requestDateTime = new Date().toISOString();
const coordinationDate = calculateDataCoordinationDate(requestDateTime);

// セグメントのステータスを「格納対応中」に更新し、データ連携目途を保存
onSegmentUpdate(segment.segment_id, {
  location_request_status: 'storing',
  data_coordination_date: coordinationDate,
});
```

#### 4. `/components/SegmentTable.tsx`
セグメント一覧にデータ連携目途カラムを表示

```typescript
{segment.data_coordination_date ? (
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
    <span className="text-sm text-gray-900">
      {formatDateToMMDD(segment.data_coordination_date)}
    </span>
  </div>
) : (
  <span className="text-gray-400 text-sm">-</span>
)}
```

## テスト

### テストケース
`/utils/dataCoordinationDate.test.ts`に6つのテストケースを用意

**実行方法:**
```typescript
import { calculateDataCoordinationDate } from './utils/dataCoordinationDate';

// テスト実行
const result = calculateDataCoordinationDate('2024-11-18T15:00:00+09:00');
console.log(result); // => '2024-11-20'
```

## データベース

### 保存タイミング
格納依頼ボタンをクリックした時点で、以下の処理を実行：
1. ジオコーディング処理
2. セグメントステータスを「格納対応中」に更新
3. **データ連携目途を自動計算して保存** ← 新規追加

### 保存フィールド
- `location_request_status`: 'storing'（格納対応中）
- `data_coordination_date`: 'YYYY-MM-DD'（計算結果）

## UI表示

### セグメント管理タブ
セグメント一覧テーブルに「データ連携目途」カラムを表示

**表示形式:**
- データあり: `11/20`（MM/DD形式）+ 青いアニメーション点
- データなし: `-`（グレーアウト）

**表示条件:**
- 格納依頼が完了したセグメントのみ表示
- 未依頼のセグメントは`-`を表示

## 今後の拡張予定

### 祝日対応
現在は土日のみ除外しているが、将来的には祝日も営業日から除外する

### 期日アラート
データ連携目途が近づいたら、管理部にアラート通知を送る

### 連携予定日との連携
`data_link_scheduled_date`（連携予定日）との整合性チェック機能を追加

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|---------|--------|
| 2024-11-18 | 初版作成 | - |
