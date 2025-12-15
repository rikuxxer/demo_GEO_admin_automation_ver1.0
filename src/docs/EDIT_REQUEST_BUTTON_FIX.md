# 編集依頼ボタンの表示バグ修正 & フィールド不整合修正

## 問題1: 修正依頼ボタンが表示されない

登録後の案件（セグメントが1件以上ある案件）で「案件情報の修正依頼」ボタンが表示されなかった。

## 問題2: 修正依頼ダイアログのフィールド不整合

修正依頼ダイアログに一部のフィールドが欠けており、重要な情報を変更できなかった。

## 原因

`canDirectEdit`関数の呼び出し方が間違っていた。

### 間違った呼び出し方

```typescript
// ProjectDetail.tsx 277行目（修正前）
canDirectEdit(user, project)

// ProjectDetail.tsx 307行目（修正前）
!canDirectEdit(user, project)
```

### 正しい関数シグネチャ

```typescript
// utils/editRequest.ts
export function canDirectEdit(
  type: 'project' | 'segment' | 'poi',
  data: Project | Segment | PoiInfo,
  allSegments?: Segment[],
  parentSegment?: Segment
): boolean
```

**第1引数は`user`ではなく`type`**

## 修正内容

### 1. 直接編集ボタンの条件（277行目）

```typescript
// 修正前
{canDirectEdit(user, project) && !isEditingProject && (

// 修正後
{canEditProject(user, project) && canDirectEdit('project', project, segments) && !isEditingProject && (
```

**意味:**
- `canEditProject(user, project)` - ユーザーに編集権限があるか
- `canDirectEdit('project', project, segments)` - 直接編集が可能か（セグメントが0件の場合）
- `!isEditingProject` - 現在編集中でないか

### 2. 修正依頼ボタンの条件（307行目）

```typescript
// 修正前
{onEditRequestCreate && segments.length > 0 && canEditProject(user, project) && !canDirectEdit(user, project) && (

// 修正後
{onEditRequestCreate && canEditProject(user, project) && !canDirectEdit('project', project, segments) && (
```

**意味:**
- `onEditRequestCreate` - 修正依頼作成のコールバックが存在するか
- `canEditProject(user, project)` - ユーザーに編集権限があるか
- `!canDirectEdit('project', project, segments)` - 直接編集が不可（セグメントが1件以上の場合）

**注:** `segments.length > 0`の重複チェックを削除しました。`canDirectEdit`の内部で同じチェックが行われています。

## ビジネスロジック

### 案件の編集パターン

#### パターン1: セグメントが0件の場合
- **直接編集ボタン**が表示される
- 修正依頼ボタンは表示されない
- 理由: まだ登録作業が完了していないため、自由に編集可能

#### パターン2: セグメントが1件以上の場合
- 直接編集ボタンは表示されない
- **修正依頼ボタン**が表示される
- 理由: すでにセグメント登録が始まっているため、修正には承認フローが必要

### 権限チェック

両方のボタンとも、以下の権限チェックが行われます：

```typescript
canEditProject(user, project)
```

これは以下をチェック：
- **管理者**: すべての案件を編集可能
- **営業**: 自分が主担当または副担当の案件のみ編集可能

## テスト方法

### テストケース1: セグメント0件の案件

1. 営業Aでログイン
2. 新規案件を作成（営業Aが主担当）
3. 案件詳細画面を開く
4. **期待結果**: 「編集」ボタンが表示される

### テストケース2: セグメント1件以上の案件

1. 営業Aでログイン
2. 案件を作成
3. セグメントを1件追加
4. 案件概要タブに戻る
5. **期待結果**: 「案件情報の修正依頼」ボタンが表示される

### テストケース3: 他人の案件

1. 営業Bでログイン
2. 営業Aが主担当の案件を開く
3. **期待結果**: 編集ボタンも修正依頼ボタンも表示されない（権限なし）

### テストケース4: 管理者

1. 管理者でログイン
2. 任意の案件を開く
3. **期待結果**: 
   - セグメント0件の場合 → 「編集」ボタン
   - セグメント1件以上の場合 → 「案件情報の修正依頼」ボタン

## 関連する関数

### `requiresEditRequest`（utils/editRequest.ts）

```typescript
export function requiresEditRequest(
  type: 'project' | 'segment' | 'poi',
  data: Project | Segment | PoiInfo,
  allSegments?: Segment[],
  parentSegment?: Segment
): boolean {
  switch (type) {
    case 'project': {
      // 案件: 配下のセグメントが1件以上存在する場合
      const project = data as Project;
      const projectSegments = allSegments?.filter(s => s.project_id === project.project_id) || [];
      return projectSegments.length >= 1;
    }
    
    case 'segment': {
      // セグメント: 地点格納依頼後（格納対応中または格納完了）
      const segment = data as Segment;
      return segment.location_request_status === 'storing' || 
             segment.location_request_status === 'completed';
    }
    
    case 'poi': {
      // 地点: セグメントの地点格納依頼後
      if (!parentSegment) return false;
      return parentSegment.location_request_status === 'storing' || 
             parentSegment.location_request_status === 'completed';
    }
    
    default:
      return false;
  }
}
```

### `canDirectEdit`（utils/editRequest.ts）

```typescript
export function canDirectEdit(
  type: 'project' | 'segment' | 'poi',
  data: Project | Segment | PoiInfo,
  allSegments?: Segment[],
  parentSegment?: Segment
): boolean {
  return !requiresEditRequest(type, data, allSegments, parentSegment);
}
```

**重要:** `canDirectEdit`は`requiresEditRequest`の逆の結果を返します。

### `canEditProject`（utils/editRequest.ts）

```typescript
export function canEditProject(
  user: { role: string; name: string } | null,
  project: Project
): boolean {
  // 管理者は常に編集可能
  if (user?.role === 'admin') {
    return true;
  }
  
  // 営業の場合、主担当または副担当の案件のみ編集可能
  if (user?.role === 'sales') {
    return (
      project.person_in_charge === user.name ||
      project.sub_person_in_charge === user.name
    );
  }
  
  return false;
}
```

## 修正内容2: 修正依頼ダイアログのフィールド追加

### 修正前の状態

**直接編集モード（セグメント0件）**
- ✅ UNIVERSEサービスID
- ✅ UNIVERSEサービス名
- ✅ 副担当者

**修正依頼ダイアログ（セグメント1件以上）** ← 不整合！
- ✅ 広告主法人名
- ✅ 代理店名
- ✅ 主担当者
- ✅ 副担当者
- ✅ 配信開始日
- ✅ 配信終了日
- ❌ 訴求内容 ← 欠けていた！
- ❌ UNIVERSEサービスID ← 欠けていた！
- ❌ UNIVERSEサービス名 ← 欠けていた！
- ❌ 備考 ← 欠けていた！

### 修正後の状態

**修正依頼ダイアログ（すべてのフィールドを含む）**
1. 広告主法人名
2. 代理店名（任意）
3. **訴求内容** ← 追加
4. **UNIVERSEサービスID（任意）** ← 追加
5. **UNIVERSEサービス名（任意）** ← 追加
6. 主担当者
7. 副担当者（任意）
8. 配信開始日
9. 配信終了日
10. **備考（任意）** ← 追加

### 修正理由

承認フローを経由するため、**すべてのプロジェクトフィールド**の変更を許可すべき。特に訴求内容は重要なフィールドであり、修正依頼で変更できないのは大きな問題だった。

### フィールド配置順

ユーザビリティを考慮し、以下の順序で配置：
1. 基本情報（法人名、代理店名）
2. 訴求内容（重要フィールド）
3. UNIVERSEサービス情報
4. 担当者情報
5. 配信期間
6. 備考

## まとめ

修正により、以下が正しく動作するようになりました：

1. ✅ セグメント0件の案件 → **直接編集ボタン**表示
2. ✅ セグメント1件以上の案件 → **修正依頼ボタン**表示
3. ✅ 権限のないユーザー → ボタン非表示
4. ✅ 管理者 → 適切なボタンが表示
5. ✅ **修正依頼ですべてのフィールドを変更可能** ← 追加修正

これにより、登録後の案件でもすべての情報の修正依頼ができるようになりました。
