---
name: project-conventions
description: UNIVERSEGEO プロジェクトのコーディング規約、ファイル構成、命名規則、技術スタック固有のパターンを提供する。新しいコードを書く際、ファイルを追加する際、リファクタリングする際に使用する。
---

# プロジェクトコーディング規約

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18 + TypeScript + Vite |
| スタイリング | Tailwind CSS |
| UIコンポーネント | shadcn/ui (Radix UI) |
| バックエンド | Express + TypeScript |
| データベース | Google BigQuery |
| デプロイ | Google Cloud Run + GitHub Actions |

## ディレクトリ構成

```
src/                          # フロントエンド
├── components/               # Reactコンポーネント（機能単位）
│   └── ui/                   # shadcn/ui 共通UIコンポーネント
├── contexts/                 # React Context（1ファイル1コンテキスト）
├── types/
│   └── schema.ts             # 型定義の集約ファイル
└── utils/                    # ユーティリティ（1ファイル1機能）

backend/
└── src/
    ├── index.ts              # Express サーバー & 全APIルート
    ├── bigquery-client.ts    # BigQuery サービス層
    └── middleware/            # Express ミドルウェア
```

## 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネントファイル | PascalCase.tsx | `ProjectForm.tsx` |
| ユーティリティファイル | camelCase.ts | `geocoding.ts` |
| コンポーネント名 | PascalCase | `AdminDashboard` |
| 関数名 | camelCase | `getProjects` |
| 定数 | UPPER_SNAKE_CASE | `BQ_LOCATION` |
| 型/インターフェース | PascalCase | `Project`, `Segment` |
| CSS クラス | Tailwind ユーティリティ | `className="flex items-center gap-2"` |

## TypeScript ルール

- strict モード有効
- 型のみのインポートは `import type { ... }` を使用
- パスエイリアス: `@/*` → `src/*`
- `any` 型の使用は最小限に（やむを得ない場合はコメントで理由を記載）

```typescript
// Good
import type { Project, Segment } from '@/types/schema';
import { Button } from '@/components/ui/button';

// Bad
import { Project } from '@/types/schema'; // type-only import を使うべき
```

## フロントエンドパターン

### コンポーネント作成

```typescript
import type { Project } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ProjectCardProps {
  project: Project;
  onEdit: (id: string) => void;
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{project.advertiser_name}</h3>
      <Button onClick={() => onEdit(project.project_id)}>編集</Button>
    </div>
  );
}
```

### 型定義の追加

新しい型は `src/types/schema.ts` に追加する。各ファイルで個別に定義しない。

### UI コンポーネント

- 基本UIは `src/components/ui/` の shadcn/ui コンポーネントを使用
- アイコンは Lucide React (`lucide-react`) を使用
- トースト通知は Sonner (`sonner`) を使用
- フォームは React Hook Form (`react-hook-form`) を使用
- グラフは Recharts (`recharts`) を使用

### 新しいUIコンポーネントが必要な場合

shadcn/ui にあるものは自作しない。既存の `src/components/ui/` を確認し、なければ Radix UI プリミティブから shadcn/ui パターンで作成する。

## バックエンドパターン

### API エンドポイント追加

```typescript
// backend/src/index.ts に追加
app.get('/api/resource', asyncWrapper(async (req, res) => {
  const result = await bigQueryService.getResources();
  res.json(result);
}));

app.post('/api/resource', asyncWrapper(async (req, res) => {
  const data = req.body;
  const result = await bigQueryService.createResource(data);
  res.status(201).json(result);
}));
```

- 全ハンドラーを `asyncWrapper` でラップ
- エラーは `errorHandler` ミドルウェアで統一処理
- レスポンスは JSON 形式

### BigQuery 関数追加

`backend/src/bigquery-client.ts` に追加。直接 `index.ts` にクエリを書かない。

## 環境設定

| 環境 | 設定ファイル |
|------|------------|
| 開発 | `config/dev/vite.config.dev.ts` |
| 本番 | `config/prod/vite.config.prod.ts` |
| バックエンド | `.env` (環境変数) |
| CI/CD | `.github/workflows/` |

## やるべきこと / やらないこと

### やるべきこと

- 既存の型定義 (`schema.ts`) を再利用する
- BigQuery 操作は `bigquery-client.ts` に集約する
- shadcn/ui コンポーネントを活用する
- パラメータ化クエリを使用する
- エラーを構造化された形式で返す

### やらないこと

- `src/components/ui/` に既にあるUIを自作しない
- BigQuery クエリを `index.ts` に直書きしない
- シークレットをハードコードしない
- `any` 型を安易に使用しない
- ESLint / Prettier は未導入のため設定ファイルを追加しない（将来導入予定）
