# Excel一括登録の制限事項と注意点

**バージョン:** 1.0  
**最終更新日:** 2024年12月  

---

## ⚠️ 重要な制限事項

### Excel一括登録は「新規登録専用」です

Excel一括登録機能は、**新規案件の一括登録**のみをサポートしています。  
既存案件の更新には対応していません。

---

## 📋 Excelに含まれるフィールドと含まれないフィールド

### ✅ Excelに含まれるフィールド

#### **案件情報（②案件情報シート）**
- 広告主名 (`advertiser_name`)
- 代理店名 (`agency_name`)
- 訴求内容 (`appeal_point`)
- 配信開始日 (`delivery_start_date`)
- 配信終了日 (`delivery_end_date`)
- 備考 (`remarks`)

#### **セグメント設定（③セグメント設定シート）**
- セグメント名 (`segment_name`)
- 配信先 (`media_id`)
- 配信範囲 (`designated_radius`)
- 配信期間 (`extraction_period`)
- 対象者 (`attribute`)
- 検知回数 (`detection_count`)
- 検知時間開始 (`detection_time_start`)
- 検知時間終了 (`detection_time_end`)
- 滞在時間 (`stay_time`)
- AdsアカウントID (`ads_account_id`)

#### **地点情報（④地点リストシート）**
- どのセグメント？ (`segment_name_ref`)
- 地点の名前 (`poi_name`)
- 住所 (`address`)
- 緯度 (`latitude`)
- 経度 (`longitude`)

---

### ❌ Excelに含まれないフィールド（手動入力専用）

#### **案件情報**
- **UNIVERSEサービスID** (`universe_service_id`)
- **UNIVERSEサービス名** (`universe_service_name`)
- **副担当者** (`sub_person_in_charge`)

#### **セグメント設定**
- **パイロット/プロバイダセグメントID** (`provider_segment_id`)
- **地点依頼ステータス** (`location_request_status`)
- **連携依頼フラグ** (`request_confirmed`)
- **データ連携依頼ステータス** (`data_link_status`)
- **連携予定日** (`data_link_scheduled_date`)
- **データ連携依頼日** (`data_link_request_date`)

#### **自動設定フィールド**
- 案件ID (`project_id`)
- 登録日 (`_register_datetime`)
- 主担当者 (`person_in_charge`)
- 案件ステータス (`project_status`)
- セグメントID (`segment_id`)
- セグメント登録日時 (`segment_registered_at`)
- 地点ID (`poi_id`)
- 地点登録日 (`created`)

---

## ⚙️ Excel一括登録時の動作

### 1. 新規登録時の初期化

Excel一括登録で案件を作成すると、Excelに含まれないフィールドは以下のように初期化されます：

#### **案件情報**
```typescript
{
  universe_service_id: '',  // 空文字列
  universe_service_name: '', // 空文字列
  sub_person_in_charge: '',  // 空文字列
  person_in_charge: 'ログインユーザー名', // 自動設定
  project_status: 'draft' // 自動設定（準備中）
}
```

#### **セグメント設定**
```typescript
{
  provider_segment_id: '',  // 空文字列
  location_request_status: 'not_requested', // 未依頼
  request_confirmed: false, // false
  data_link_status: 'before_request', // 連携依頼前
  data_link_scheduled_date: '', // 空文字列
  extraction_period_type: 'preset' // プリセット固定
}
```

#### **地点情報**
```typescript
{
  poi_type: 'manual', // 任意地点指定固定
  // セグメントの共通条件を地点にも引き継ぎ
  designated_radius: segment.designated_radius,
  extraction_period: segment.extraction_period,
  // ... その他のセグメント共通条件
}
```

---

## 🚫 やってはいけないこと

### ❌ Excel一括登録後の再登録

**問題のあるワークフロー:**

1. Excel一括登録で案件を作成
2. 画面上で手動入力項目を編集（AdsアカウントID、サービスIDなど）
3. ❌ **同じExcelファイルを再度アップロードして更新しようとする**

**結果:**
- 新しい案件が重複して作成される、または
- 手動で入力した項目（AdsアカウントID、サービスIDなど）が失われる

---

## ✅ 正しい運用方法

### パターン1: Excel一括登録 → 画面で編集

```
STEP 1: Excel一括登録で案件の基本情報を登録
  ↓
STEP 2: 案件詳細画面で手動入力項目を追加
  • UNIVERSEサービスID/サービス名
  • 副担当者
  ↓
STEP 3: セグメント詳細画面で追加情報を入力
  • AdsアカウントID
  • パイロット/プロバイダセグメントID
  • データ連携依頼
  ↓
STEP 4: 以降は画面上で編集を継続
```

### パターン2: 画面で全て登録

```
STEP 1: 案件登録フォームから新規案件を作成
  ↓
STEP 2: セグメント登録フォームからセグメントを作成
  ↓
STEP 3: 地点登録フォームまたはCSV一括登録で地点を追加
  ↓
STEP 4: すべての情報を画面上で入力・編集
```

---

## 💡 更新が必要な場合の対処法

### 案件情報の更新

**Excel一括登録後に案件情報を変更したい場合:**

1. 案件一覧から対象案件を選択
2. 案件詳細画面で「編集」ボタンをクリック
3. ProjectFormで情報を編集
4. 保存

### セグメント情報の更新

**Excel一括登録後にセグメント情報を変更したい場合:**

1. 案件詳細画面の「セグメント管理」タブを開く
2. 対象セグメントの「編集」ボタンをクリック
3. SegmentFormで情報を編集
4. 保存

### 地点情報の更新

**Excel一括登録後に地点情報を変更したい場合:**

1. 案件詳細画面の「地点情報」タブを開く
2. 対象地点の「編集」ボタンをクリック
3. PoiFormで情報を編集
4. 保存

---

## 🔮 将来の機能拡張（検討中）

以下の機能は現在検討中ですが、まだ実装されていません：

### 1. 既存案件のExcelエクスポート

- 既存案件のデータをExcel形式でダウンロード
- 手動入力項目も含めてすべてのフィールドを出力
- ダウンロードしたExcelを編集して再アップロードで更新

### 2. Excelでの案件更新機能

- 案件IDを含むExcelをアップロード
- 既存案件のデータを更新（上書きではなくマージ）
- Excelに含まれないフィールドは保持

### 3. 差分更新モード

- 変更された項目のみを更新
- 空欄の項目は既存値を保持

---

## 📝 よくある質問（FAQ）

### Q1: Excel一括登録後、AdsアカウントIDを追加したい

**A:** 案件詳細画面のセグメント管理タブから、各セグメントを個別に編集してください。

```
1. 案件一覧 → 対象案件をクリック
2. 「セグメント管理」タブを開く
3. 対象セグメントの「編集」をクリック
4. 「AdsアカウントID」フィールドに入力
5. 保存
```

### Q2: Excelで登録後、UNIVERSEサービスIDを設定したい

**A:** 案件詳細画面で案件情報を編集してください。

```
1. 案件一覧 → 対象案件をクリック
2. 案件詳細画面の「編集」ボタンをクリック
3. 「UNIVERSEサービスID」「UNIVERSEサービス名」を入力
4. 保存
```

### Q3: Excel一括登録したデータをExcelで再編集できますか？

**A:** いいえ、現在は対応していません。  
Excel一括登録は新規作成専用です。既存案件の編集は画面上のフォームから行ってください。

### Q4: 手動で入力した項目がExcelに含まれていないのはなぜですか？

**A:** 以下の理由により、一部の項目はExcelテンプレートに含めていません：

- **営業が入力すべきでない項目**: プロバイダセグメントIDは管理部が入力するため
- **ワークフローの段階で入力する項目**: データ連携依頼は地点登録完了後に行うため
- **シンプルさの維持**: Excel入力項目を最小限にし、社外の方でも入力しやすくするため

### Q5: Excelテンプレートにサービス IDを追加できませんか？

**A:** 可能ですが、以下の理由により現状では含めていません：

- 社外の方（広告主・代理店）が入力する項目ではない
- 営業担当者が後から入力する管理項目
- Excelを複雑にせず、必須項目のみに絞っている

必要に応じて、将来的に「管理者向けExcelテンプレート」として拡張版を提供する可能性があります。

---

## 🎯 ベストプラクティス

### 推奨ワークフロー

```
【広告主・代理店】
  ↓ Excelテンプレートに基本情報を入力
  ↓ 営業担当者に送付

【営業担当者】
  ↓ Excelファイルを一括登録
  ↓ 案件が作成される（基本情報のみ）
  ↓ 案件詳細画面でUNIVERSEサービス情報を追加
  ↓ セグメント詳細画面でAdsアカウントIDを追加
  ↓ 地点格納依頼を確定
  ↓ データ連携依頼を送信

【管理部】
  ↓ パイロット/プロバイダセグメントIDを入力
  ↓ データ連携ステータスを更新
```

### 分業体制

| 役割 | 入力項目 | 入力方法 |
|------|---------|---------|
| **広告主/代理店** | 案件基本情報、セグメント設定、地点リスト | Excel一括登録 |
| **営業担当者** | UNIVERSEサービス情報、AdsアカウントID、副担当者 | 画面フォーム |
| **管理部** | プロバイダセグメントID、データ連携ステータス | 画面フォーム |

---

## 📚 関連ドキュメント

- [Excel一括登録機能 仕様書](/docs/EXCEL_BULK_IMPORT_SPEC.md)
- [Excelテンプレート定義](/docs/EXCEL_TEMPLATE_DEFINITION.csv)
- [テーブル定義](/docs/TABLE_DEFINITIONS.md)
- [システム仕様書](/docs/SYSTEM_SPECIFICATION.md)

---

## 🔧 技術的な背景

### なぜExcelに含まれないフィールドがあるのか？

1. **段階的なワークフロー**: 案件登録 → 地点確認 → データ連携という段階的なプロセスに対応
2. **権限分離**: 営業が入力すべき項目と管理部が入力すべき項目を分離
3. **データ整合性**: 自動生成されるID類はシステムが管理
4. **ユーザビリティ**: Excelテンプレートをシンプルに保ち、社外の方でも入力しやすくする

### データの保持ロジック

Excel一括登録時に、Excelに含まれないフィールドは以下のように処理されます：

```typescript
// BulkImport.tsx の handleImport 関数
const createdProject = await bigQueryService.createProject({
  ...result.project, // Excelから読み込んだデータ
  // 以下は自動設定またはデフォルト値
  universe_service_id: '', // 後から画面で入力
  universe_service_name: '', // 後から画面で入力
  sub_person_in_charge: '', // 後から画面で入力
});

const createdSegment = await bigQueryService.createSegment({
  ...segment, // Excelから読み込んだデータ
  // 以下は自動設定またはデフォルト値
  provider_segment_id: '', // 後から管理部が入力
  location_request_status: 'not_requested', // 初期ステータス
  request_confirmed: false, // 初期値
  data_link_status: 'before_request', // 初期ステータス
  extraction_period_type: 'preset', // Excelは常にプリセット
});
```

これにより、Excelに含まれないフィールドは空文字列や初期値で作成され、後から画面上で追加入力できるようになっています。

---

**このドキュメントに関する質問やフィードバックは、開発チームまでお願いします。**
