# エラー検知システム

## 概要

UNIVERSEGEOには以下のエラー検知・品質保証の仕組みが実装されています。

## 1. 静的型チェック (TypeScript)

### 概要
TypeScriptの型システムにより、コンパイル時にエラーを検出します。

### カバー範囲
- ✅ 変数の型不一致
- ✅ 関数の引数・戻り値の型チェック
- ✅ 存在しないプロパティへのアクセス
- ✅ null/undefined の安全なアクセス

### 使用方法
```bash
# 型チェックの実行（ビルド時に自動実行）
npm run build
```

### 例
```typescript
// ❌ コンパイルエラー
const segment: Segment = {
  media_id: 123  // エラー: string[] 型を期待
};

// ✅ 正しい
const segment: Segment = {
  media_id: ['universe']
};
```

## 2. バリデーションユーティリティ

### 概要
`/utils/validation.ts` に実装されたバリデーション関数により、ランタイムでデータの妥当性をチェックします。

### 主要な機能

#### `validateMediaSelection()`
配信媒体の選択可能状態を検証します。

```typescript
const result = validateMediaSelection(
  selectedMediaIds,
  existingSegments,
  currentSegmentId
);

console.log(result);
// {
//   isValid: false,
//   availableMedia: ['universe', 'tver_sp'],
//   disabledMedia: ['tver_ctv'],
//   errors: ['案件内に既にUNIVERSE/TVer(SP)が登録されています'],
//   warnings: []
// }
```

#### `validateSegment()`
セグメント全体のバリデーションを実行します。

```typescript
const result = validateSegment(segmentData, existingSegments, poiCount);

if (!result.isValid) {
  console.error('バリデーションエラー:', result.errors);
  // 例: [
  //   { field: 'media_id', message: '配信媒体を選択してください' },
  //   { field: 'ads_account_id', message: '連携依頼確定にはAdsアカウントIDが必要です' }
  // ]
}
```

### 開発モードでのデバッグログ

SegmentFormでは、開発環境で自動的にバリデーション結果をコンソールに出力します。

```typescript
// SegmentForm.tsx 内で自動実行
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    logValidationDebug('SegmentForm', formData, validationResult);
  }
}, [selectedMediaIds, formData]);
```

### ブラウザコンソールでの出力例
```
🔍 [SegmentForm] Validation Debug
  Data: { media_id: [], segment_name: "..." }
  Validation Result: { isValid: false, errors: [...] }
  ❌ Validation Errors: ["配信媒体を選択してください"]
```

## 3. エラーバウンダリ

### 概要
Reactコンポーネントツリー内で発生したエラーをキャッチし、アプリケーション全体のクラッシュを防ぎます。

### 実装箇所
- `App.tsx` 全体を `<ErrorBoundary>` でラップ
- フォーム固有のエラーには `<FormErrorBoundary>` を使用可能

### 機能
- ✅ エラー発生時に代替UIを表示
- ✅ 開発環境ではエラー詳細とスタックトレースを表示
- ✅ エラーをコンソールに記録
- ✅ 再試行・ホームに戻る機能

### 使用例
```typescript
// App.tsx
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppWrapper />
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

## 4. フォームバリデーション

### セグメントフォーム
以下の項目をバリデーションします：

#### 必須項目チェック
- 配信媒体（media_id）
- データ連携ステータス（data_link_status）
- 地点依頼ステータス（location_request_status）

#### ビジネスロジックチェック
- TVer(CTV) の排他制御
  - ❌ TVer(CTV) + UNIVERSE/TVer(SP) の併用不可
  - ❌ 既存セグメントにUNIVERSE/TVer(SP)がある場合、TVer(CTV)選択不可
  - ❌ 既存セグメントにTVer(CTV)がある場合、UNIVERSE/TVer(SP)選択不可

#### 連携依頼確定時のチェック
- 地点数が1以上
- AdsアカウントIDが入力済み
- データ連携予定日が入力済み

### Excel一括登録
別途 `/docs/BULK_IMPORT_VALIDATION.md` を参照

## 5. 開発環境でのエラー検知方法

### ブラウザの開発者ツール

#### 1. コンソールでのログ確認
```javascript
// ブラウザのコンソールで確認できる情報：
// - バリデーション結果（開発モードのみ）
// - エラーバウンダリでキャッチしたエラー
// - APIエラー
```

#### 2. Reactの警告
```
Warning: Each child in a list should have a unique "key" prop.
Warning: Can't perform a React state update on an unmounted component.
```

### Visual Studio Code拡張機能
推奨拡張機能：
- **ESLint**: コードの静的解析
- **TypeScript**: 型チェック
- **Error Lens**: エラーをインラインで表示

## 6. エラー検知のベストプラクティス

### 開発時
1. **常にブラウザのコンソールを開く**
   - `F12` キーで開発者ツールを開く
   - Console タブを確認

2. **TypeScriptエラーを無視しない**
   - `@ts-ignore` は原則使用しない
   - 型エラーは必ず修正する

3. **バリデーション結果を確認**
   - 開発モードでは自動的にログ出力される
   - 想定外の動作があればコンソールを確認

### デバッグ方法

#### ステップ1: エラーの種類を特定
```
1. コンパイルエラー（TypeScript）
   → VSCodeで赤線が表示される
   
2. ランタイムエラー
   → ブラウザコンソールにエラー表示
   
3. バリデーションエラー
   → フォーム送信時にアラート表示
   → 開発モードではコンソールにログ出力
```

#### ステップ2: エラー箇所の特定
```typescript
// ブラウザコンソールのエラーメッセージ例:
Error: Cannot read property 'media_id' of undefined
  at SegmentForm (SegmentForm.tsx:73)
  at renderWithHooks (react-dom.development.js:14985)
  ...
  
// → SegmentForm.tsx の 73行目を確認
```

#### ステップ3: console.log でデバッグ
```typescript
// 変数の内容を確認
console.log('selectedMediaIds:', selectedMediaIds);
console.log('existingSegments:', existingSegments);

// オブジェクト全体を整形して表示
console.log('formData:', JSON.stringify(formData, null, 2));
```

## 7. テストシナリオ

### 配信媒体選択のテストケース

#### ケース1: 新規セグメント作成時（既存セグメントなし）
```
期待動作: 全ての媒体を選択可能
- ✅ UNIVERSE を選択可能
- ✅ TVer(SP) を選択可能
- ✅ TVer(CTV) を選択可能
```

#### ケース2: 既存セグメントにTVer(CTV)がある場合
```
期待動作: UNIVERSE/TVer(SP)のみ選択可能
- ✅ UNIVERSE を選択可能
- ✅ TVer(SP) を選択可能
- ❌ TVer(CTV) を選択不可（グレーアウト）
```

#### ケース3: 既存セグメントにUNIVERSE/TVer(SP)がある場合
```
期待動作: UNIVERSE/TVer(SP)のみ選択可能
- ✅ UNIVERSE を選択可能
- ✅ TVer(SP) を選択可能
- ❌ TVer(CTV) を選択不可（グレーアウト）
```

#### ケース4: 同一セグメント内での併用チェック
```
期待動作: TVer(CTV)と他媒体は併用不可
- ✅ UNIVERSE + TVer(SP) は併用可能
- ❌ UNIVERSE + TVer(CTV) は併用不可（エラー表示）
- ❌ TVer(SP) + TVer(CTV) は併用不可（エラー表示）
```

### 実行手順
```
1. セグメント管理タブを開く
2. 「新規セグメント追加」をクリック
3. 配信媒体のチェックボックスを確認
4. 各チェックボックスをクリックして動作確認
5. ブラウザのコンソールでバリデーション結果を確認
```

## 8. トラブルシューティング

### 問題: 配信媒体が選択できない

#### 確認事項
1. ブラウザのコンソールを開く
2. バリデーションログを確認
   ```
   🔍 [SegmentForm] Validation Debug
   → disabledMedia を確認
   → warnings を確認
   ```
3. 既存セグメントの状態を確認
   ```typescript
   console.log('existingSegments:', existingSegments.map(s => ({
     id: s.segment_id,
     media: s.media_id
   })));
   ```

### 問題: フォーム送信時にエラー

#### 確認事項
1. コンソールのエラーメッセージを確認
2. バリデーション結果を確認
   ```
   ❌ Validation Errors: [...]
   ```
3. 必須項目が全て入力されているか確認

### 問題: アプリケーションがクラッシュ

#### 確認事項
1. エラーバウンダリの画面が表示されているか
2. 開発モードの場合、エラー詳細を確認
3. ブラウザのコンソールでスタックトレースを確認

## 9. 今後の改善案

### 自動テストの導入
- **ユニットテスト**: Jest + React Testing Library
- **E2Eテスト**: Playwright または Cypress
- **ビジュアルリグレッションテスト**: Chromatic

### 監視・アラート
- **エラートラッキング**: Sentry
- **パフォーマンス監視**: Lighthouse CI
- **ログ集約**: CloudWatch Logs

### CI/CDの強化
- **自動テスト実行**: GitHub Actions
- **型チェック**: pre-commit hook
- **リンター**: ESLint + Prettier の自動実行
