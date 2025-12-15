# 案件閲覧権限仕様書

## 概要

営業担当者が案件を閲覧する際のビジネスロジックを定義します。
営業は自分の担当案件はすべてのステータスで閲覧できますが、他の営業の案件はデータ連携が完了した案件のみ閲覧できます。

## ビジネスルール

### 管理者（admin）
- **すべての案件を閲覧可能**
- ステータスに関わらず全案件にアクセスできる

### 営業担当者（sales）

#### 自分が担当している案件
- **主担当（person_in_charge）または副担当（sub_person_in_charge）の案件**
- すべてのステータスで閲覧可能
  - ✅ 下書き（draft）: セグメント未登録の案件
  - ✅ 進行中（in_progress）: セグメント登録済みの案件
  - ✅ 連携完了（linked）: データ連携が完了した案件

#### 他の営業の案件
- **連携完了（linked）の案件のみ閲覧可能**
  - ❌ 下書き（draft）: 閲覧不可
  - ❌ 進行中（in_progress）: 閲覧不可
  - ✅ 連携完了（linked）: 閲覧可能

## 実装詳細

### 関数: `canViewProject`

**パス**: `/utils/editRequest.ts`

```typescript
export function canViewProject(
  user: { role: string; name: string } | null,
  project: Project,
  projectStatus: 'draft' | 'in_progress' | 'linked'
): boolean
```

**パラメータ**:
- `user`: ユーザー情報（ロールと名前）
- `project`: 案件情報
- `projectStatus`: 案件ステータス（'draft' | 'in_progress' | 'linked'）

**戻り値**:
- `true`: 閲覧権限がある
- `false`: 閲覧権限がない

**ロジック**:
1. 管理者の場合 → 常に `true`
2. 営業の場合:
   - 自身が主担当または副担当 → `true`
   - 他の営業の案件で `projectStatus === 'linked'` → `true`
   - それ以外 → `false`

### 適用箇所

#### 1. ProjectTable.tsx
- 案件一覧の表示フィルタリング
- 閲覧権限のない案件は一覧に表示されない

```typescript
const filteredProjects = allProjects.filter(project => {
  const statusInfo = getAutoProjectStatus(project, segments, pois);
  if (!canViewProject(user, project, statusInfo.status)) {
    return false;
  }
  // 他のフィルタ条件...
});
```

#### 2. App.tsx
- 案件詳細を開く際の権限チェック
- 権限がない場合はエラーメッセージを表示

```typescript
const handleProjectClick = async (project: Project) => {
  const statusInfo = getAutoProjectStatus(project, allSegments, allPois);
  if (!canViewProject(user, project, statusInfo.status)) {
    toast.error("この案件を閲覧する権限がありません");
    return;
  }
  // 案件詳細を表示...
};
```

#### 3. SummaryCards.tsx
- サマリーカードの集計対象を閲覧権限に基づいてフィルタリング

```typescript
const filteredProjects = projects.filter(project => {
  const statusInfo = getAutoProjectStatus(project, segments, pois);
  return canViewProject(user, project, statusInfo.status);
});
```

## 使用例

### シナリオ 1: 営業Aが自分の案件を閲覧
- 案件: PRJ-0001（主担当: 営業A、ステータス: 下書き）
- ユーザー: 営業A
- 結果: ✅ 閲覧可能（自分の担当案件なのですべてのステータスで閲覧可）

### シナリオ 2: 営業Aが他の営業の進行中案件を閲覧しようとする
- 案件: PRJ-0002（主担当: 営業B、ステータス: 進行中）
- ユーザー: 営業A
- 結果: ❌ 閲覧不可（他人の案件で連携完了ではない）

### シナリオ 3: 営業Aが他の営業の連携完了案件を閲覧
- 案件: PRJ-0003（主担当: 営業B、ステータス: 連携完了）
- ユーザー: 営業A
- 結果: ✅ 閲覧可能（連携完了案件は他の営業も参照可）

### シナリオ 4: 営業Aが副担当の案件を閲覧
- 案件: PRJ-0004（主担当: 営業B、副担当: 営業A、ステータス: 進行中）
- ユーザー: 営業A
- 結果: ✅ 閲覧可能（副担当なのですべてのステータスで閲覧可）

### シナリオ 5: 管理者が任意の案件を閲覧
- 案件: PRJ-0005（主担当: 営業B、ステータス: 下書き）
- ユーザー: 管理者
- 結果: ✅ 閲覧可能（管理者はすべての案件を閲覧可）

## 既存機能との関係

### 編集権限（canEditProject）との違い

| 権限 | 対象 | 条件 |
|------|------|------|
| **編集権限** | 案件の編集 | 管理者 または 主担当/副担当 |
| **閲覧権限** | 案件の表示 | 管理者 または 主担当/副担当 または（他人の案件で連携完了） |

### 「自分の案件のみ」フィルタとの関係
- **閲覧権限**: ベースラインとして常に適用される（閲覧できない案件は絶対に表示されない）
- **「自分の案件のみ」フィルタ**: 営業が任意でON/OFFできる追加フィルタ
  - ON: 自分が担当している案件のみ表示
  - OFF: 閲覧権限のあるすべての案件を表示（自分の案件 + 他人の連携完了案件）

## セキュリティ考慮事項

### データ漏洩の防止
- 進行中の案件情報は担当者のみに限定
- 連携完了後は組織全体で情報共有が可能

### 監査ログ（今後の拡張）
- 他の営業の連携完了案件を閲覧した際のログ記録
- 不正アクセスの検知と追跡

## テスト項目

### ユニットテスト
- [ ] 管理者は常に閲覧可能
- [ ] 営業は主担当案件をすべてのステータスで閲覧可能
- [ ] 営業は副担当案件をすべてのステータスで閲覧可能
- [ ] 営業は他人の下書き案件を閲覧不可
- [ ] 営業は他人の進行中案件を閲覧不可
- [ ] 営業は他人の連携完了案件を閲覧可能

### 統合テスト
- [ ] 案件一覧で閲覧権限のない案件が表示されない
- [ ] 案件詳細を直接URLで開こうとしてもエラーになる
- [ ] サマリーカードの集計に閲覧権限のない案件が含まれない
- [ ] 「自分の案件のみ」フィルタと閲覧権限が正しく連動する

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2024-11-17 | 1.0.0 | 初版作成 |
