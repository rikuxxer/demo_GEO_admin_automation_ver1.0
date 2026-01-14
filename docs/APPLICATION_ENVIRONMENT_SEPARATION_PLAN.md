# アプリケーション環境分離計画

## 📋 概要

アプリケーションコードを開発環境と本番環境で分離するための計画です。

## 🎯 分離方式の選択

### 方式1: 設定ファイル分離方式（推奨）⭐⭐⭐⭐⭐

**特徴**:
- コードは共通で、設定ファイルのみ分離
- 環境変数とビルド設定を環境ごとに管理
- メンテナンスが容易
- コード重複なし

**構造**:
```
UNIVERSEGEO_backup/
├── src/                    # 共通コード
├── backend/
│   └── src/               # 共通コード
├── config/
│   ├── dev/
│   │   ├── vite.config.dev.ts
│   │   ├── backend.config.dev.ts
│   │   └── .env.example
│   └── prod/
│       ├── vite.config.prod.ts
│       ├── backend.config.prod.ts
│       └── .env.example
└── scripts/
    ├── build-dev.sh
    ├── build-prod.sh
    └── deploy-dev.sh
    └── deploy-prod.sh
```

### 方式2: 環境固有コード分離方式

**特徴**:
- 環境固有の実装が必要な部分のみ分離
- 大部分は共通コード
- 環境固有の機能を追加しやすい

**構造**:
```
UNIVERSEGEO_backup/
├── src/
│   ├── common/            # 共通コード
│   ├── dev/               # 開発環境専用コード
│   └── prod/              # 本番環境専用コード
└── backend/
    ├── src/
    │   ├── common/        # 共通コード
    │   ├── dev/           # 開発環境専用コード
    │   └── prod/          # 本番環境専用コード
```

### 方式3: 完全分離方式

**特徴**:
- 開発環境と本番環境で完全に別々のコードベース
- 環境間の混同がない
- コード重複が発生
- メンテナンスが困難

**構造**:
```
UNIVERSEGEO_backup/
├── environments/
│   ├── dev/
│   │   ├── frontend/
│   │   └── backend/
│   └── prod/
│       ├── frontend/
│       └── backend/
└── shared/                # 共通コード（シンボリックリンク）
```

## 🚀 推奨実装: 設定ファイル分離方式

### 実装ステップ

#### ステップ1: 環境ごとの設定ファイル作成

1. **フロントエンド設定**
   - `config/dev/vite.config.dev.ts` - 開発環境用Vite設定
   - `config/prod/vite.config.prod.ts` - 本番環境用Vite設定

2. **バックエンド設定**
   - `config/dev/backend.config.dev.ts` - 開発環境用バックエンド設定
   - `config/prod/backend.config.prod.ts` - 本番環境用バックエンド設定

3. **環境変数ファイル**
   - `config/dev/.env.example` - 開発環境用環境変数テンプレート
   - `config/prod/.env.example` - 本番環境用環境変数テンプレート

#### ステップ2: ビルドスクリプトの分離

1. **package.jsonに環境ごとのスクリプトを追加**
   ```json
   {
     "scripts": {
       "dev": "vite --config config/dev/vite.config.dev.ts",
       "build:dev": "vite build --config config/dev/vite.config.dev.ts",
       "build:prod": "vite build --config config/prod/vite.config.prod.ts",
       "start:dev": "node backend/dist/index.js --env=dev",
       "start:prod": "node backend/dist/index.js --env=prod"
     }
   }
   ```

2. **環境ごとのデプロイスクリプト**
   - `scripts/deploy-dev.sh` - 開発環境デプロイ
   - `scripts/deploy-prod.sh` - 本番環境デプロイ

#### ステップ3: 環境固有コードの条件分岐

環境固有の実装が必要な場合は、環境変数で制御：

```typescript
// src/utils/config.ts
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.MODE === 'development' 
      ? 'http://localhost:8080' 
      : 'https://universegeo-backend-223225164238.asia-northeast1.run.app'),
  enableDebug: import.meta.env.MODE === 'development',
  logLevel: import.meta.env.MODE === 'development' ? 'debug' : 'info',
};
```

## 📊 比較表

| 方式 | メリット | デメリット | 実装難易度 | 推奨度 |
|------|---------|-----------|-----------|--------|
| **設定ファイル分離** | コード重複なし、メンテナンス容易 | 環境固有コード追加がやや複雑 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **環境固有コード分離** | 環境固有機能を追加しやすい | コード構造が複雑になる | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **完全分離** | 環境間の混同がない | コード重複、メンテナンス困難 | ⭐⭐⭐⭐ | ⭐⭐ |

## 🎯 推奨実装

**設定ファイル分離方式**を推奨します。

理由：
1. 現在のコード構造を維持できる
2. 環境ごとの設定のみを分離できる
3. 実装が簡単で、リスクが低い
4. メンテナンスが容易
5. コード重複がない

## 📝 実装詳細

### 1. Vite設定の分離

```typescript
// config/dev/vite.config.dev.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  mode: 'development',
  define: {
    'import.meta.env.MODE': JSON.stringify('development'),
  },
  build: {
    outDir: 'build-dev',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});

// config/prod/vite.config.prod.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  mode: 'production',
  define: {
    'import.meta.env.MODE': JSON.stringify('production'),
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    minify: 'terser',
  },
});
```

### 2. バックエンド設定の分離

```typescript
// config/dev/backend.config.dev.ts
export const devConfig = {
  port: 8080,
  frontendUrl: 'http://localhost:5173',
  nodeEnv: 'development',
  logLevel: 'debug',
  enableCors: true,
};

// config/prod/backend.config.prod.ts
export const prodConfig = {
  port: 8080,
  frontendUrl: process.env.FRONTEND_URL || 'https://universegeo-i5xw76aisq-an.a.run.app',
  nodeEnv: 'production',
  logLevel: 'info',
  enableCors: true,
};
```

### 3. 環境変数の管理

```bash
# config/dev/.env.example
VITE_API_BASE_URL=http://localhost:8080
VITE_ENV=development
DEBUG=true

# config/prod/.env.example
VITE_API_BASE_URL=https://universegeo-backend-223225164238.asia-northeast1.run.app
VITE_ENV=production
DEBUG=false
```

## 🔄 移行計画

1. **フェーズ1**: 設定ファイルの分離（1-2時間）
2. **フェーズ2**: ビルドスクリプトの更新（1時間）
3. **フェーズ3**: 環境変数の整理（1時間）
4. **フェーズ4**: テストと検証（1-2時間）

合計: 4-6時間
