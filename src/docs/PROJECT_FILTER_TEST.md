# 案件フィルター機能のテスト結果

## テスト環境
- ブラウザ: Chrome/Firefox/Safari
- 開発モード: `NODE_ENV=development`
- コンソール: F12で開発者ツールを開く

## モックデータの担当者割り当て

以下のモックデータが自動生成されます：

| 案件ID | 主担当 | 副担当 | project_status | 備考 |
|--------|--------|--------|----------------|------|
| PRJ-0001 (i=0) | 営業A | 営業B | in_progress | 営業Bが副担当 |
| PRJ-0002 (i=1) | 営業B | - | completed | 営業Bが主担当 |
| PRJ-0003 (i=2) | 営業A | - | draft | 営業Aのみ |
| PRJ-0004 (i=3) | 営業B | - | in_progress | 営業Bが主担当 |
| PRJ-0005 (i=4) | 営業A | 営業B | completed | 営業Bが副担当 |
| PRJ-0006 (i=5) | 営業B | - | draft | 営業Bが主担当 |

### モックデータ生成ロジック

```javascript
person_in_charge: i % 2 === 0 ? '営業A' : '営業B'
// i が偶数 → 営業A、i が奇数 → 営業B

sub_person_in_charge: i % 4 === 0 ? (i % 2 === 0 ? '営業B' : '営業A') : undefined
// i が 0, 4, 8... → 副担当あり
//   - i % 2 === 0 なら営業B
//   - i % 2 === 1 なら営業A
// それ以外 → 副担当なし
```

## 期待される表示結果

### 営業Aでログイン + フィルターON

**表示される案件:**
- PRJ-0001（営業Aが主担当）
- PRJ-0002（営業Bが主担当、営業Aが**副担当**ではない → 表示されない）
- PRJ-0003（営業Aが主担当）
- PRJ-0004（営業Bが主担当、営業Aが**副担当**ではない → 表示されない）
- PRJ-0005（営業Aが主担当）
- PRJ-0006（営業Bが主担当、営業Aが**副担当**ではない → 表示されない）

**期待結果: 3件（PRJ-0001, PRJ-0003, PRJ-0005）**

### 営業Bでログイン + フィルターON

**表示される案件:**
- PRJ-0001（営業Aが主担当、営業Bが**副担当** → 表示される✓）
- PRJ-0002（営業Bが主担当 → 表示される✓）
- PRJ-0003（営業Aが主担当、営業Bは担当ではない → 表示されない）
- PRJ-0004（営業Bが主担当 → 表示される✓）
- PRJ-0005（営業Aが主担当、営業Bが**副担当** → 表示される✓）
- PRJ-0006（営業Bが主担当 → 表示される✓）

**期待結果: 5件（PRJ-0001, PRJ-0002, PRJ-0004, PRJ-0005, PRJ-0006）**

### 管理者でログイン

**表示される案件:**
- すべての案件（6件）

**期待結果: 6件（全件）**

## 閲覧権限の影響

`canViewProject`関数によって、以下のルールが適用されます：

### 営業の場合
1. **自分の案件（主担当または副担当）**: すべてのステータスで閲覧可能
2. **他人の案件**: **連携完了（status='linked'）**の場合のみ閲覧可能

### モックデータの場合
- セグメントが空なので、`getAutoProjectStatus`は**すべて'draft'（下書き）**を返す
- したがって、営業は**他人の案件を閲覧できない**（連携完了の案件がないため）

### 重要ポイント
- **フィルターOFF**でも、他人の下書き/進行中の案件は表示されない
- **フィルターON**は、閲覧権限のある案件の中から、さらに自分の案件のみに絞り込む

## テスト手順

### 1. 営業Bでログイン
```
Email: salesB@example.com
Password: demo123
```

### 2. ブラウザコンソールを開く（F12）

### 3. コンソールログを確認

#### ログイン直後
```javascript
[ProjectFilter] モックデータの担当者: [
  { id: "PRJ-0001", person_in_charge: "営業A", sub_person_in_charge: "営業B" },
  { id: "PRJ-0002", person_in_charge: "営業B", sub_person_in_charge: undefined },
  { id: "PRJ-0003", person_in_charge: "営業A", sub_person_in_charge: undefined },
  { id: "PRJ-0004", person_in_charge: "営業B", sub_person_in_charge: undefined },
  { id: "PRJ-0005", person_in_charge: "営業A", sub_person_in_charge: "営業B" },
  { id: "PRJ-0006", person_in_charge: "営業B", sub_person_in_charge: undefined }
]

[ProjectFilter] フィルター状態変更: {
  showMyProjectsOnly: true,
  userRole: "sales",
  userName: "営業B",
  totalProjects: 6
}
```

#### フィルター処理のログ
```javascript
[ProjectFilter] PRJ-0001: {
  showMyProjectsOnly: true,
  userName: "営業B",
  personInCharge: "営業A",
  subPersonInCharge: "営業B",
  isMyProject: true,  // ← 営業Bが副担当なので true
  result: "✓表示"
}

[ProjectFilter] PRJ-0002: {
  showMyProjectsOnly: true,
  userName: "営業B",
  personInCharge: "営業B",
  subPersonInCharge: undefined,
  isMyProject: true,  // ← 営業Bが主担当なので true
  result: "✓表示"
}

[ProjectFilter] PRJ-0003: 閲覧権限なし
// ↑ 営業Aのみの案件で、status='draft'なので閲覧権限なし

[ProjectFilter] PRJ-0004: {
  showMyProjectsOnly: true,
  userName: "営業B",
  personInCharge: "営業B",
  subPersonInCharge: undefined,
  isMyProject: true,
  result: "✓表示"
}

[ProjectFilter] PRJ-0005: {
  showMyProjectsOnly: true,
  userName: "営業B",
  personInCharge: "営業A",
  subPersonInCharge: "営業B",
  isMyProject: true,  // ← 営業Bが副担当なので true
  result: "✓表示"
}

[ProjectFilter] PRJ-0006: {
  showMyProjectsOnly: true,
  userName: "営業B",
  personInCharge: "営業B",
  subPersonInCharge: undefined,
  isMyProject: true,
  result: "✓表示"
}
```

#### フィルター結果サマリー
```javascript
[ProjectFilter] ========== フィルター結果サマリー ==========
ユーザー: 営業B (sales)
フィルターON: true
全案件数: 6
フィルター後: 5件
表示される案件: [
  { id: "PRJ-0001", person_in_charge: "営業A", sub_person_in_charge: "営業B" },
  { id: "PRJ-0002", person_in_charge: "営業B", sub_person_in_charge: undefined },
  { id: "PRJ-0004", person_in_charge: "営業B", sub_person_in_charge: undefined },
  { id: "PRJ-0005", person_in_charge: "営業A", sub_person_in_charge: "営業B" },
  { id: "PRJ-0006", person_in_charge: "営業B", sub_person_in_charge: undefined }
]
[ProjectFilter] ==========================================
```

### 4. 画面上の件数表示を確認
```
案件一覧 （5件 / 全6件）
```

### 5. フィルターボタンをクリック（OFF）
```javascript
[ProjectFilter] ボタンクリック: {
  before: true,
  after: false,
  userName: "営業B"
}

[ProjectFilter] フィルター状態変更: {
  showMyProjectsOnly: false,
  userRole: "sales",
  userName: "営業B",
  totalProjects: 6
}
```

#### フィルターOFF後の結果
```javascript
[ProjectFilter] ========== フィルター結果サマリー ==========
ユーザー: 営業B (sales)
フィルターON: false
全案件数: 6
フィルター後: 5件  // ← PRJ-0003は閲覧権限がないため表示されない
表示される案件: [...]
[ProjectFilter] ==========================================
```

**重要:** フィルターOFFでも、PRJ-0003（営業Aのみの下書き案件）は表示されません。これは閲覧権限の制御によるものです。

### 6. 画面上の表示を確認
```
案件一覧 （5件）
```

## よくある誤解

### ❌ 誤解1: フィルターOFFですべての案件が表示される

**正解:** フィルターOFFでも、**閲覧権限のある案件のみ**が表示されます。

- 営業は他人の**下書き・進行中**の案件は見えない
- 営業は他人の**連携完了**の案件のみ見える

### ❌ 誤解2: 副担当の案件は表示されない

**正解:** 副担当の案件も**自分の案件**として扱われます。

```javascript
const isMyProject = 
  project.person_in_charge === user.name ||     // 主担当
  project.sub_person_in_charge === user.name;   // 副担当
```

### ❌ 誤解3: 営業Bでログインすると営業Bが主担当の案件のみ表示される

**正解:** 営業Bが**主担当または副担当**の案件が表示されます。

営業Bの場合:
- PRJ-0001（副担当として参加）← **表示される**
- PRJ-0002（主担当）
- PRJ-0004（主担当）
- PRJ-0005（副担当として参加）← **表示される**
- PRJ-0006（主担当）

## 問題が発生している場合のチェックリスト

### チェック1: ユーザー名を確認
```javascript
// コンソールで確認
console.log('User:', user);
// 期待値: { name: "営業B", role: "sales", ... }
```

### チェック2: フィルター状態を確認
```javascript
// コンソールで確認
console.log('showMyProjectsOnly:', showMyProjectsOnly);
// 期待値: true（初期状態）
```

### チェック3: 表示されている案件を確認
コンソールの「フィルター結果サマリー」を見て、`person_in_charge`と`sub_person_in_charge`を確認します。

### チェック4: 期待と異なる案件が表示されている場合
その案件のログを確認：
```javascript
[ProjectFilter] PRJ-XXXX: {
  userName: "営業B",
  personInCharge: "???",  // ← ここを確認
  subPersonInCharge: "???",  // ← ここを確認
  isMyProject: true/false,
  result: "✓表示" or "✗非表示"
}
```

## 実際のデータでテスト

モックデータではなく、実際のデータでテストする場合：

### 営業Bの案件を作成
1. 管理者でログイン
2. 新規案件を作成
   - 主担当: 営業B
3. 営業Bでログイン
4. その案件が表示されることを確認

### 営業Bが副担当の案件を作成
1. 管理者でログイン
2. 新規案件を作成
   - 主担当: 営業A
   - 副担当: 営業B
3. 営業Bでログイン
4. その案件が表示されることを確認

### 営業Aのみの案件を作成
1. 管理者でログイン
2. 新規案件を作成
   - 主担当: 営業A
   - 副担当: なし
3. 営業Bでログイン
4. その案件が**表示されない**ことを確認（閲覧権限なし）

## コードの確認ポイント

### フィルター条件（ProjectTable.tsx 100行目）
```typescript
const isMyProject = 
  project.person_in_charge === user.name || 
  project.sub_person_in_charge === user.name;
```

✅ **正しい**: 主担当と副担当の両方をチェックしています

### 閲覧権限チェック（editRequest.ts 377-379行目）
```typescript
const isAssigned = 
  project.person_in_charge === user.name ||
  project.sub_person_in_charge === user.name;
```

✅ **正しい**: 主担当と副担当の両方をチェックしています

## まとめ

**自分の案件のみフィルター**は以下のように動作します：

1. **副担当も含まれます**
2. 営業Bでログインした場合、営業Bが主担当**または**副担当の案件が表示されます
3. フィルターOFFでも、閲覧権限のない案件（他人の下書き/進行中の案件）は表示されません

モックデータの場合、営業Bでログインすると**5件の案件**が表示されるのが正常な動作です。
