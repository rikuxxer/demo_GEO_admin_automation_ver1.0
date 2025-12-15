# デバッグガイド

## 開発環境でのエラー検知方法

### 1. ブラウザの開発者ツールを開く

**Chrome/Edge:**
- Windows/Linux: `F12` または `Ctrl + Shift + I`
- Mac: `Cmd + Option + I`

**Firefox:**
- Windows/Linux: `F12` または `Ctrl + Shift + I`
- Mac: `Cmd + Option + I`

### 2. コンソールタブを確認

開発モードで実行すると、以下のような情報が自動的に出力されます：

```
🔍 [SegmentForm] Validation Debug
  Data: {
    formData: {...},
    selectedMediaIds: [],
    existingSegments: 2,
    poiCount: 0
  }
  Validation Result: {
    media: {
      isValid: false,
      availableMedia: ['universe', 'tver_sp'],
      disabledMedia: ['tver_ctv'],
      errors: ['配信媒体を選択してください'],
      warnings: ['tver_ctv: 他のセグメントにUNIVERSE/TVer(SP)が存在するため選択不可']
    }
  }
```

### 3. バリデーション結果の読み方

#### ✅ 正常な場合
```javascript
{
  isValid: true,
  availableMedia: ['universe', 'tver_sp', 'tver_ctv'],
  disabledMedia: [],
  errors: [],
  warnings: []
}
```

#### ❌ エラーがある場合
```javascript
{
  isValid: false,
  availableMedia: ['universe', 'tver_sp'],
  disabledMedia: ['tver_ctv'],
  errors: [
    '配信媒体を選択してください'
  ],
  warnings: [
    'tver_ctv: 他のセグメントにUNIVERSE/TVer(SP)が存在するため選択不可'
  ]
}
```

## よくあるエラーパターンと解決方法

### パターン1: 「配信媒体が選択できない」

#### 症状
- チェックボックスがグレーアウトしている
- クリックしても選択できない

#### 原因確認
1. ブラウザのコンソールを開く
2. `disabledMedia` と `warnings` を確認

```javascript
// コンソール出力例
disabledMedia: ['tver_ctv'],
warnings: ['tver_ctv: 他のセグメントにUNIVERSE/TVer(SP)が存在するため選択不可']
```

#### 解決方法
- **他のセグメントにTVer(CTV)が存在**: UNIVERSE/TVer(SP)のみ選択可能
- **他のセグメントにUNIVERSE/TVer(SP)が存在**: UNIVERSE/TVer(SP)のみ選択可能（TVer(CTV)は別セグメントとして作成）

### パターン2: 「フォーム送信時にエラー」

#### 症状
- 「保存」ボタンをクリックしてもエラーで弾かれる
- アラートが表示される

#### 原因確認
```javascript
// コンソール出力例
❌ Validation Errors: [
  { field: 'media_id', message: '配信媒体を選択してください' },
  { field: 'ads_account_id', message: '連携依頼確定にはAdsアカウントIDが必要です' }
]
```

#### 解決方法
1. エラーメッセージで指摘されているフィールドを確認
2. 必須項目を入力
3. もう一度保存を試行

### パターン3: 「画面が真っ白になった」

#### 症状
- エラー発生後、画面が真っ白または代替UIが表示される
- 「エラーが発生しました」というメッセージが表示される

#### 原因確認
エラーバウンダリがエラーをキャッチしています。

**開発モード:**
```
エラーが発生しました

開発モード - エラー詳細:
TypeError: Cannot read property 'media_id' of undefined
  at SegmentForm (SegmentForm.tsx:73)
  ...
```

**本番モード:**
```
エラーが発生しました
予期しないエラーが発生しました

[再試行] [ホームに戻る]
```

#### 解決方法
1. 開発モードの場合、エラー詳細を確認
2. スタックトレースから問題箇所を特定
3. 該当コードを修正
4. 「再試行」ボタンをクリック

### パターン4: 「TypeScriptエラー」

#### 症状
- Visual Studio Codeで赤い波線が表示される
- ビルドが失敗する

#### エラー例
```typescript
// ❌ エラー
const segment: Segment = {
  media_id: 'universe'  // Type 'string' is not assignable to type 'string[]'
};

// ✅ 修正
const segment: Segment = {
  media_id: ['universe']
};
```

#### 解決方法
1. エラーメッセージを読んで型の不一致を確認
2. 正しい型に修正
3. ビルドを再実行

## デバッグテクニック

### 1. console.log を活用

```typescript
// 変数の内容を確認
console.log('selectedMediaIds:', selectedMediaIds);

// オブジェクトを整形して表示
console.log('formData:', JSON.stringify(formData, null, 2));

// 複数の値を一度に確認
console.log({ selectedMediaIds, existingSegments, poiCount });
```

### 2. console.table を使う

配列データを見やすく表示：

```typescript
// セグメント一覧を表形式で表示
console.table(existingSegments.map(s => ({
  id: s.segment_id,
  name: s.segment_name,
  media: s.media_id
})));
```

### 3. デバッガーを使う

```typescript
// ブレークポイントを設定
debugger;

// この行で実行が止まり、変数の内容を確認できる
```

### 4. React DevTools を使う

**インストール:**
- Chrome: [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)

**使い方:**
1. 開発者ツールで「Components」タブを開く
2. コンポーネントツリーから該当コンポーネントを選択
3. 右側で props と state を確認

## チェックリスト

### セグメントフォームのデバッグ

- [ ] ブラウザのコンソールを開いている
- [ ] `NODE_ENV=development` で実行している
- [ ] バリデーションログが出力されている
- [ ] `availableMedia` と `disabledMedia` を確認した
- [ ] `errors` と `warnings` を確認した
- [ ] 既存セグメントの状態を確認した
- [ ] 必須項目が全て入力されている

### エラー発生時

- [ ] エラーメッセージを読んだ
- [ ] スタックトレースで問題箇所を特定した
- [ ] console.log でデータを確認した
- [ ] ブラウザを再読み込みした
- [ ] キャッシュをクリアした
- [ ] 別のブラウザで試した

## コードレビューのポイント

### バグを防ぐために確認すること

1. **null/undefined チェック**
   ```typescript
   // ❌ 危険
   const count = segment.pois.length;
   
   // ✅ 安全
   const count = segment?.pois?.length || 0;
   ```

2. **配列の存在確認**
   ```typescript
   // ❌ 危険
   segments.map(s => ...)
   
   // ✅ 安全
   (segments || []).map(s => ...)
   ```

3. **型の明示**
   ```typescript
   // ❌ 曖昧
   const [data, setData] = useState({});
   
   // ✅ 明確
   const [data, setData] = useState<Segment | null>(null);
   ```

4. **エラーハンドリング**
   ```typescript
   // ❌ エラーを無視
   const result = await api.call();
   
   // ✅ エラーをキャッチ
   try {
     const result = await api.call();
   } catch (error) {
     console.error('API Error:', error);
     toast.error('エラーが発生しました');
   }
   ```

## パフォーマンスデバッグ

### React DevTools の Profiler

1. 開発者ツールで「Profiler」タブを開く
2. 🔴 ボタンをクリックして記録開始
3. アプリを操作
4. ⏹️ ボタンで記録停止
5. レンダリング時間を確認

### 遅いコンポーネントの特定

```typescript
// コンポーネントのレンダリング時間を計測
useEffect(() => {
  const start = performance.now();
  return () => {
    const end = performance.now();
    console.log(`SegmentForm render time: ${end - start}ms`);
  };
});
```

## 本番環境でのデバッグ

### エラー情報の収集

本番環境では詳細なエラー情報は表示されませんが、以下の方法で情報を収集できます：

1. **ブラウザのコンソール**
   - エラーログを確認
   - スクリーンショットを撮る

2. **再現手順の記録**
   - どの画面で
   - どのボタンをクリックして
   - どのようなエラーが発生したか

3. **環境情報**
   - ブラウザの種類とバージョン
   - OS
   - 画面サイズ

### サポートへの報告テンプレート

```
【発生日時】
2025-11-17 14:30

【エラー内容】
セグメント追加時に配信媒体が選択できない

【再現手順】
1. 案件詳細画面を開く
2. 「セグメント管理」タブをクリック
3. 「新規セグメント追加」をクリック
4. 配信媒体のチェックボックスがすべてグレーアウト

【期待する動作】
配信媒体を選択できること

【スクリーンショット】
（添付）

【環境】
- ブラウザ: Chrome 120.0.0
- OS: Windows 11
- 画面サイズ: 1920x1080
```

## まとめ

エラーを早期に発見するためのポイント：

1. **開発時は常にコンソールを開く**
2. **TypeScriptのエラーを無視しない**
3. **バリデーション結果を確認する**
4. **React DevToolsを活用する**
5. **console.logで変数を確認する**

困ったときは：

1. **エラーメッセージを読む**
2. **スタックトレースを確認する**
3. **ドキュメントを参照する**
4. **チームに相談する**
