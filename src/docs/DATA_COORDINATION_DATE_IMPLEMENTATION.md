# データ連携目途 自動計算機能 実装完了報告

## 実装概要

格納依頼のタイミングで、データ連携目途を自動計算してセグメントに保存する機能を実装しました。

## 実装内容

### 1. データベーススキーマ更新

**ファイル: `/types/schema.ts`**

Segmentインターフェースに新しいフィールドを追加：
```typescript
data_coordination_date?: string; // データ連携目途（格納依頼日から自動計算）
```

### 2. 計算ロジック実装

**ファイル: `/utils/dataCoordinationDate.ts`**

**主要な関数:**

#### `calculateDataCoordinationDate(requestDateTime: string): string`
格納依頼日時からデータ連携目途を計算

**計算ルール:**
1. 20:00以降の依頼は翌日扱い
2. 依頼日から次の月・水・金を探す
3. **月・水・金に依頼した場合**: 次の月・水・金をそのまま返す
4. **その他の曜日（火・木・土・日）に依頼した場合**: 次の月・水・金 + 1営業日

**具体例:**
```typescript
// 月曜日15時に依頼
calculateDataCoordinationDate('2024-11-18T15:00:00+09:00')
// => '2024-11-20' (水曜日)

// 火曜日10時に依頼
calculateDataCoordinationDate('2024-11-19T10:00:00+09:00')
// => '2024-11-21' (木曜日 = 水曜日 + 1営業日)

// 月曜日21時に依頼（20時以降 → 翌日扱い）
calculateDataCoordinationDate('2024-11-18T21:00:00+09:00')
// => '2024-11-21' (木曜日 = 火曜日扱い → 水曜日 + 1営業日)

// 金曜日19時に依頼
calculateDataCoordinationDate('2024-11-22T19:00:00+09:00')
// => '2024-11-25' (月曜日)
```

#### `formatDateToMMDD(dateString: string): string`
表示用のフォーマット関数（YYYY-MM-DD → MM/DD）

### 3. 格納依頼時の自動計算

**ファイル: `/components/ProjectDetail.tsx`**

格納依頼ボタンをクリックした際に、データ連携目途を自動計算して保存：

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

### 4. UI表示

**ファイル: `/components/SegmentTable.tsx`**

セグメント一覧テーブルに「データ連携目途」カラムを追加：

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

**表示仕様:**
- データあり: `11/20` (MM/DD形式) + 青いアニメーション点
- データなし: `-` (グレーアウト)

### 5. テストケース

**ファイル: `/utils/dataCoordinationDate.test.ts`**

6つのテストケースを用意：
1. 月曜日15時 → 水曜日
2. 火曜日10時 → 木曜日
3. 月曜日21時（翌日扱い）→ 木曜日
4. 金曜日19時 → 月曜日
5. 水曜日14時 → 金曜日
6. 木曜日16時 → 月曜日

## 処理フロー

```
1. ユーザーが「格納依頼」ボタンをクリック
   ↓
2. ジオコーディング処理を実行
   ↓
3. 現在日時を取得（ISO 8601形式）
   ↓
4. データ連携目途を自動計算
   ・20:00以降チェック
   ・次の月・水・金を探す
   ・曜日による加算処理
   ↓
5. セグメント更新
   ・location_request_status: 'storing'
   ・data_coordination_date: '2024-11-20'
   ↓
6. UI更新
   ・セグメント一覧に「11/20」と表示
   ・青いアニメーション点を表示
```

## 動作確認項目

### ✅ 基本機能
- [x] 格納依頼時にデータ連携目途が自動計算される
- [x] 計算結果がデータベースに保存される
- [x] セグメント一覧に連携目途が表示される

### ✅ 計算ロジック
- [x] 20:00以降は翌日扱いになる
- [x] 月・水・金の依頼は次の月・水・金を返す
- [x] 火・木の依頼は次の月・水・金 + 1営業日を返す
- [x] 土日は営業日から除外される

### ✅ UI表示
- [x] データがある場合はMM/DD形式で表示
- [x] データがない場合は「-」を表示
- [x] 青いアニメーション点が表示される

## 今後の拡張予定

### 祝日対応
現在は土日のみ除外しているが、将来的には祝日も営業日から除外する

**実装案:**
```typescript
// 祝日リストを定義
const HOLIDAYS = [
  '2024-01-01', // 元日
  '2024-01-08', // 成人の日
  // ...
];

function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  const dateStr = formatDateToYYYYMMDD(date);
  
  // 土日または祝日の場合は営業日ではない
  return day >= 1 && day <= 5 && !HOLIDAYS.includes(dateStr);
}
```

### 期日アラート機能
データ連携目途が近づいたら、管理部にアラート通知を送る

**実装案:**
- データ連携目途の前日にSlack/メール通知
- ダッシュボードに期日が近いセグメントを表示

### 連携予定日との整合性チェック
`data_link_scheduled_date`（連携予定日）との整合性をチェック

**実装案:**
- 連携予定日がデータ連携目途より前の場合は警告表示
- 管理部が手動で調整できる機能を追加

## 関連ドキュメント

- [データ連携目途 仕様書](/docs/DATA_COORDINATION_DATE_SPEC.md)
- [システム仕様書](/docs/SYSTEM_SPECIFICATION.md)
- [テーブル定義](/docs/TABLE_DEFINITIONS.md)

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|---------|--------|
| 2024-11-18 | 初版作成 | - |
| 2024-11-18 | 計算ロジック修正（曜日による加算処理を追加） | - |
