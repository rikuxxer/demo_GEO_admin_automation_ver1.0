---
description: フロントエンド (React + TypeScript) のコード変更時に適用
globs: src/**/*.{ts,tsx}
---

# フロントエンドルール

## コンポーネント作成

- 関数コンポーネント + TypeScript Props 型を使用
- shadcn/ui コンポーネント (`src/components/ui/`) を優先利用
- スタイリングは Tailwind CSS ユーティリティクラス
- アイコンは `lucide-react`
- トースト通知は `sonner`
- フォームは `react-hook-form`

## 型定義

- 新しい型は `src/types/schema.ts` に追加
- 型のみのインポートは `import type { ... }` を使用
- パスエイリアス: `@/*` → `src/*`

## 禁止

- `src/components/ui/` に既存のUIコンポーネントがあれば自作しない
- `any` 型の安易な使用
