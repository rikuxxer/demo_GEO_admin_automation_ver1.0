# 案件フィルター機能のデバッグガイド

## 概要

「自分の案件のみ」フィルターボタンが正しく動作しない場合のデバッグ方法を説明します。

## フィルター機能の仕様

### 対象ユーザー
- **営業（sales）**: ボタンが表示され、フィルター機能を使用可能
- **管理者（admin）**: ボタンは表示されず、常に全案件が表示される

### フィルター動作
- **ONの場合**: 自分が主担当または副担当の案件のみ表示
- **OFFの場合**: 閲覧権限のあるすべての案件を表示（自分の案件 + 他人の連携完了案件）

## デバッグ方法

### 1. ブラウザのコンソールを開く

1. `F12` キーを押して開発者ツールを開く
2. 「Console」タブを選択

### 2. フィルターボタンをクリック

ボタンをクリックすると、以下のログが出力されます：

```javascript
[ProjectFilter] ボタンクリック: {
  before: true,    // クリック前の状態
  after: false,    // クリック後の状態
  userName: "営業A"
}
```

### 3. フィルター状態の確認

フィルター状態が変更されると、以下のログが出力されます：

```javascript
[ProjectFilter] フィルター状態変更: {
  showMyProjectsOnly: false,
  userRole: "sales",
  userName: "営業A",
  totalProjects: 16
}
```

### 4. フィルター適用結果の確認

フィルター適用後、以下のログが出力されます：

```javascript
[ProjectFilter] フィルター後の案件数: {
  filtered: 8,
  total: 16,
  showMyProjectsOnly: false
}
```

### 5. 個別案件のフィルター判定

各案件に対するフィルター判定のログ：

```javascript
[ProjectFilter] PRJ-0001: {
  showMyProjectsOnly: true,
  userName: "営業A",
  personInCharge: "営業A",
  subPersonInCharge: undefined,
  isMyProject: true
}

[ProjectFilter] PRJ-0002: {
  showMyProjectsOnly: true,
  userName: "営業A",
  personInCharge: "営業B",
  subPersonInCharge: "営業A",
  isMyProject: true
}

[ProjectFilter] PRJ-0003: {
  showMyProjectsOnly: true,
  userName: "営業A",
  personInCharge: "営業B",
  subPersonInCharge: undefined,
  isMyProject: false  // ← この案件はフィルタリングされる
}
```

### 6. 画面上の件数表示

案件一覧の見出しに件数が表示されます：

```
案件一覧 （8件 / 全16件）
```

- **左の数字**: フィルター後の件数
- **右の数字**: 全案件数（フィルター前）

フィルターがOFFの場合：
```
案件一覧 （16件）
```

## よくある問題と解決方法

### 問題1: ボタンをクリックしても何も変わらない

#### 確認事項
1. **ログが出力されているか**
   ```javascript
   [ProjectFilter] ボタンクリック: { before: true, after: false, ... }
   ```
   - 出力されている → 状態は更新されている
   - 出力されていない → ボタンのクリックイベントが発火していない

2. **フィルター状態変更のログが出力されているか**
   ```javascript
   [ProjectFilter] フィルター状態変更: { showMyProjectsOnly: false, ... }
   ```

3. **フィルター後の件数が変わっているか**
   - 画面上の件数表示を確認
   - `(8件 / 全16件)` → `(16件)` のように変化するはず

#### 原因
- **React の state 更新が反映されていない**: まれに発生するバグ
- **ブラウザのキャッシュ**: 古いコードが実行されている可能性

#### 解決方法
1. ページを再読み込み（`Ctrl+R` または `Cmd+R`）
2. ハードリロード（`Ctrl+Shift+R` または `Cmd+Shift+R`）
3. ブラウザのキャッシュをクリア

### 問題2: フィルターONでも他人の案件が表示される

#### 確認事項
1. **ログインユーザー名を確認**
   ```javascript
   [ProjectFilter] フィルター状態変更: {
     userName: "営業A"  // ← このユーザー名を確認
   }
   ```

2. **案件の担当者名を確認**
   ```javascript
   [ProjectFilter] PRJ-0001: {
     personInCharge: "営業A",    // 主担当
     subPersonInCharge: "営業B"  // 副担当
   }
   ```

3. **isMyProject の判定結果を確認**
   ```javascript
   isMyProject: true  // true なら表示される
   ```

#### 原因
- **担当者名の不一致**: ユーザー名と案件の担当者名が完全一致していない
  - 例: `"営業A"` と `"営業 A"` （スペースの有無）
  - 例: `"営業A"` と `"営業a"` （大文字・小文字）

#### 解決方法
1. コンソールログで実際の文字列を確認
2. 担当者名を修正
3. ログインユーザー名を確認

### 問題3: フィルターOFFでも自分の案件しか表示されない

#### 確認事項
1. **閲覧権限チェックのログを確認**
   ```javascript
   // canViewProject 関数で権限チェックが行われる
   ```

2. **案件のステータスを確認**
   - 営業は他人の「連携完了」案件のみ閲覧可能
   - 「下書き」「進行中」の案件は自分の担当案件のみ閲覧可能

#### 原因
- **他の案件がまだ連携完了していない**: 正常動作
- **閲覧権限の設定が厳しすぎる**: 仕様通り

#### 解決方法
- 他人の案件を「連携完了」ステータスにする
- または管理者権限でログインする

### 問題4: ボタンが表示されない

#### 確認事項
1. **ユーザーロールを確認**
   ```javascript
   user?.role === 'sales'  // true の場合のみボタンが表示される
   ```

2. **ログイン状態を確認**
   ```javascript
   user: {
     name: "営業A",
     role: "sales",
     ...
   }
   ```

#### 原因
- **管理者（admin）でログインしている**: 管理者にはボタンが表示されない（仕様）
- **ログインしていない**: ログインが必要

#### 解決方法
- 営業アカウントでログインする
  - Email: `salesA@example.com` または `salesB@example.com`
  - Password: `demo123`

## テストシナリオ

### シナリオ1: 営業Aでログイン

1. **営業A**（salesA@example.com）でログイン
2. 「自分の案件のみ」ボタンが**ON**（青色）で表示される
3. 営業Aが主担当または副担当の案件のみ表示される
4. ボタンをクリックして**OFF**にする
5. 営業Aの案件 + 他人の連携完了案件が表示される

#### 期待結果
- ON: 営業Aの案件のみ（例: 8件）
- OFF: 営業Aの案件 + 他人の連携完了案件（例: 12件）

### シナリオ2: 管理者でログイン

1. **管理者**（admin@example.com）でログイン
2. 「自分の案件のみ」ボタンは**表示されない**
3. すべての案件が表示される

#### 期待結果
- ボタンなし
- 全案件表示（例: 16件）

### シナリオ3: フィルター切り替え

1. 営業Aでログイン
2. 初期状態: ON（8件表示）
3. ボタンクリック → OFF（12件表示）
4. もう一度クリック → ON（8件表示）

#### コンソールログの期待出力
```javascript
[ProjectFilter] ボタンクリック: { before: true, after: false, userName: "営業A" }
[ProjectFilter] フィルター状態変更: { showMyProjectsOnly: false, ... }
[ProjectFilter] フィルター後の案件数: { filtered: 12, total: 16, showMyProjectsOnly: false }

[ProjectFilter] ボタンクリック: { before: false, after: true, userName: "営業A" }
[ProjectFilter] フィルター状態変更: { showMyProjectsOnly: true, ... }
[ProjectFilter] フィルター後の案件数: { filtered: 8, total: 16, showMyProjectsOnly: true }
```

## トラブルシューティングチェックリスト

- [ ] ブラウザのコンソールを開いている
- [ ] `NODE_ENV=development` で実行している（ログが出力される）
- [ ] ログインユーザーが営業（sales）である
- [ ] ボタンをクリックしたときにログが出力される
- [ ] フィルター状態変更のログが出力される
- [ ] フィルター後の件数が画面に表示される
- [ ] 件数が変化している
- [ ] ユーザー名と案件の担当者名が一致している
- [ ] ブラウザのキャッシュをクリアした
- [ ] ページを再読み込みした

## 関連ファイル

- `/components/ProjectTable.tsx` - フィルター機能の実装
- `/utils/editRequest.ts` - 閲覧権限の判定ロジック
- `/contexts/AuthContext.tsx` - ユーザー認証
- `/types/auth.ts` - ユーザー型定義

## サポートが必要な場合

上記のデバッグ手順でも問題が解決しない場合は、以下の情報を添えて開発チームに連絡してください：

1. **コンソールログの全文**（スクリーンショット）
2. **ログインユーザー情報**
   ```javascript
   console.log('User:', user);
   ```
3. **案件データ**
   ```javascript
   console.log('Projects:', allProjects);
   ```
4. **フィルター状態**
   ```javascript
   console.log('Filter:', showMyProjectsOnly);
   ```
