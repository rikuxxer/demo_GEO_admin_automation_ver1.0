# 複数APIキー活用戦略 - 各人の無料枠を活用する方法

## 概要

Google Maps Geocoding APIの無料枠（40,000リクエスト/月）を各ユーザーが持つAPIキーで活用することで、コストを大幅に削減します。

### 理論上の無料枠
- **1人あたり**: 40,000リクエスト/月（無料）
- **50人**: 2,000,000リクエスト/月（無料）
- **月間300,000地点登録**: 完全に無料枠内で対応可能

---

## 実装方針

### 1. ユーザーごとのAPIキー管理

各ユーザーが自分のGoogleアカウントで作成したAPIキーを登録できるようにします。

#### 1.1 データベーススキーマ（BigQuery）

```sql
-- usersテーブルにAPIキー関連のカラムを追加
ALTER TABLE `universegeo_dataset.users` ADD COLUMN IF NOT EXISTS google_maps_api_key STRING;
ALTER TABLE `universegeo_dataset.users` ADD COLUMN IF NOT EXISTS api_key_usage_count INT64 DEFAULT 0;
ALTER TABLE `universegeo_dataset.users` ADD COLUMN IF NOT EXISTS api_key_last_reset_date DATE;
ALTER TABLE `universegeo_dataset.users` ADD COLUMN IF NOT EXISTS api_key_is_active BOOL DEFAULT TRUE;
```

#### 1.2 ユーザー設定画面の追加

ユーザーが自分のAPIキーを登録・管理できる画面を追加します。

---

## 実装詳細

### 2. APIキーローテーション機能

#### 2.1 ユーザーAPIキーの取得ロジック

```typescript
// src/utils/geocoding.ts を拡張

interface UserApiKey {
  userId: string;
  apiKey: string;
  usageCount: number;
  lastResetDate: Date;
  isActive: boolean;
}

// アクティブなAPIキーのリストを取得
async function getActiveApiKeys(): Promise<UserApiKey[]> {
  // BigQueryからユーザーAPIキーを取得
  // 条件: isActive = true, usageCount < 40000, lastResetDateが今月
}

// 使用量が少ないAPIキーを優先的に選択
function selectApiKey(apiKeys: UserApiKey[]): UserApiKey | null {
  // 1. 使用量が少ない順にソート
  // 2. 無料枠内（< 40000）のAPIキーを優先
  // 3. ラウンドロビン方式で分散
  const availableKeys = apiKeys
    .filter(key => key.isActive && key.usageCount < 40000)
    .sort((a, b) => a.usageCount - b.usageCount);
  
  return availableKeys[0] || null;
}

// APIキーの使用量を更新
async function incrementApiKeyUsage(userId: string): Promise<void> {
  // BigQueryでusageCountをインクリメント
}
```

#### 2.2 ジオコーディング関数の拡張

```typescript
// src/utils/geocoding.ts

export async function geocodeAddress(
  address: string,
  userId?: string  // ユーザーIDを追加
): Promise<GeocodeResult> {
  // ... 既存のキャッシュチェック ...

  // ユーザーAPIキーを取得
  let apiKey: string | null = null;
  let selectedUserId: string | null = null;

  if (userId) {
    // ユーザー指定のAPIキーを使用
    const userApiKey = await getUserApiKey(userId);
    if (userApiKey && userApiKey.isActive && userApiKey.usageCount < 40000) {
      apiKey = userApiKey.apiKey;
      selectedUserId = userId;
    }
  }

  // ユーザーAPIキーがない、または無料枠超過の場合
  if (!apiKey) {
    // 他のユーザーのAPIキーから選択（ローテーション）
    const activeKeys = await getActiveApiKeys();
    const selectedKey = selectApiKey(activeKeys);
    
    if (selectedKey) {
      apiKey = selectedKey.apiKey;
      selectedUserId = selectedKey.userId;
    } else {
      // すべてのAPIキーが無料枠超過の場合、デフォルトAPIキーを使用
      apiKey = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';
    }
  }

  // Geocoding APIを呼び出し
  try {
    const encodedAddress = encodeURIComponent(normalizedAddress);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&language=ja`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      // ... 結果処理 ...
      
      // APIキーの使用量を更新
      if (selectedUserId) {
        await incrementApiKeyUsage(selectedUserId);
      }
      
      return geocodeResult;
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      // 無料枠超過の場合、そのAPIキーを無効化
      if (selectedUserId) {
        await deactivateApiKey(selectedUserId);
      }
      
      // 別のAPIキーでリトライ
      return await geocodeAddress(address, userId);
    }
  } catch (error) {
    // エラーハンドリング
  }
}
```

---

## ユーザー設定画面の実装

### 3. APIキー登録コンポーネント

```typescript
// src/components/UserSettings.tsx

export function UserSettings() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 現在のAPIキー情報を取得
  useEffect(() => {
    fetchUserApiKey();
  }, []);

  const fetchUserApiKey = async () => {
    const response = await fetch(`/api/users/${user.id}/api-key`);
    const data = await response.json();
    if (data.apiKey) {
      setApiKey(data.apiKey);
      setUsageCount(data.usageCount || 0);
    }
  };

  const handleSaveApiKey = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      
      if (response.ok) {
        toast.success('APIキーを登録しました');
        await fetchUserApiKey();
      }
    } catch (error) {
      toast.error('APIキーの登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2>Google Maps APIキー設定</h2>
      
      <div className="space-y-2">
        <label>APIキー</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIzaSy..."
        />
        <p className="text-sm text-gray-500">
          月間40,000リクエストまで無料で使用できます
        </p>
      </div>

      {usageCount > 0 && (
        <div className="space-y-2">
          <p>今月の使用量: {usageCount.toLocaleString()} / 40,000</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${(usageCount / 40000) * 100}%` }}
            />
          </div>
        </div>
      )}

      <button onClick={handleSaveApiKey} disabled={isLoading}>
        {isLoading ? '保存中...' : '保存'}
      </button>

      <div className="mt-4 p-4 bg-blue-50 rounded">
        <h3 className="font-bold mb-2">APIキーの作成方法</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Google Cloud Consoleにアクセス</li>
          <li>新しいプロジェクトを作成（または既存プロジェクトを選択）</li>
          <li>Geocoding APIを有効化</li>
          <li>APIキーを作成</li>
          <li>APIキーをコピーして上記に貼り付け</li>
        </ol>
        <a
          href="https://console.cloud.google.com/google/maps-apis/credentials"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline mt-2 inline-block"
        >
          Google Cloud Consoleを開く →
        </a>
      </div>
    </div>
  );
}
```

---

## バックエンドAPI実装

### 4. APIキー管理エンドポイント

```typescript
// backend/src/index.ts

// ユーザーAPIキーの取得
app.get('/api/users/:user_id/api-key', async (req, res) => {
  try {
    const user = await getBqService().getUserById(req.params.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      apiKey: user.google_maps_api_key ? '***' : null, // セキュリティのためマスク
      usageCount: user.api_key_usage_count || 0,
      lastResetDate: user.api_key_last_reset_date,
      isActive: user.api_key_is_active,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ユーザーAPIキーの登録・更新
app.post('/api/users/:user_id/api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    // APIキーの検証（簡単な形式チェック）
    if (!apiKey || !apiKey.startsWith('AIzaSy')) {
      return res.status(400).json({ error: 'Invalid API key format' });
    }
    
    // ユーザー情報を更新
    await getBqService().updateUser(req.params.user_id, {
      google_maps_api_key: apiKey,
      api_key_is_active: true,
      api_key_usage_count: 0,
      api_key_last_reset_date: new Date().toISOString().split('T')[0],
    });
    
    res.json({ message: 'API key registered successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// アクティブなAPIキー一覧の取得（管理者用）
app.get('/api/admin/api-keys', async (req, res) => {
  try {
    const users = await getBqService().getUsers();
    const activeKeys = users
      .filter(user => user.google_maps_api_key && user.api_key_is_active)
      .map(user => ({
        userId: user.user_id,
        email: user.email,
        usageCount: user.api_key_usage_count || 0,
        lastResetDate: user.api_key_last_reset_date,
      }));
    
    res.json(activeKeys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 月次リセット機能

### 5. 使用量のリセット

毎月1日にAPIキーの使用量をリセットします。

```typescript
// backend/src/index.ts または Cloud Functions

// Cloud Schedulerで毎月1日に実行
app.post('/api/admin/reset-api-usage', async (req, res) => {
  try {
    const users = await getBqService().getUsers();
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    for (const user of users) {
      if (user.google_maps_api_key) {
        await getBqService().updateUser(user.user_id, {
          api_key_usage_count: 0,
          api_key_last_reset_date: firstDayOfMonth.toISOString().split('T')[0],
          api_key_is_active: true, // 無効化されていたものも再有効化
        });
      }
    }
    
    res.json({ message: 'API usage reset successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## コスト削減効果

### 6. 期待される効果

#### 6.1 最良のケース（全員がAPIキーを登録）

- **50人 × 40,000リクエスト = 2,000,000リクエスト/月（無料）**
- **月間300,000地点登録**: 完全に無料枠内
- **コスト削減**: 約165,000円/月 → **0円/月**

#### 6.2 現実的なケース（30人がAPIキーを登録）

- **30人 × 40,000リクエスト = 1,200,000リクエスト/月（無料）**
- **月間300,000地点登録**: 完全に無料枠内
- **コスト削減**: 約165,000円/月 → **0円/月**

#### 6.3 最小ケース（10人がAPIキーを登録）

- **10人 × 40,000リクエスト = 400,000リクエスト/月（無料）**
- **月間300,000地点登録**: 完全に無料枠内
- **コスト削減**: 約165,000円/月 → **0円/月**

**結論**: 10人以上がAPIキーを登録すれば、月間300,000地点登録は完全に無料枠内で対応可能です。

---

## 🔒 セキュリティ考慮事項

### 7. セキュリティ対策

1. **APIキーの暗号化保存**
   - BigQueryに保存する前に暗号化
   - 環境変数やSecret Managerの活用

2. **APIキーの制限設定**
   - HTTPリファラー制限（Cloud RunのURLのみ許可）
   - Geocoding APIのみに制限

3. **使用量の監視**
   - 異常な使用量を検知
   - アラート通知

4. **アクセス制御**
   - ユーザーは自分のAPIキーのみ閲覧可能
   - 管理者のみ全APIキーの一覧を閲覧可能

---

## 実装チェックリスト

### 8. 実装手順

- [ ] BigQueryスキーマの更新（usersテーブルにAPIキー関連カラム追加）
- [ ] バックエンドAPI実装（APIキー管理エンドポイント）
- [ ] フロントエンド実装（ユーザー設定画面）
- [ ] ジオコーディング関数の拡張（APIキーローテーション）
- [ ] 使用量追跡機能の実装
- [ ] 月次リセット機能の実装（Cloud Scheduler）
- [ ] セキュリティ対策の実装（暗号化、制限設定）
- [ ] ドキュメント作成（ユーザー向けAPIキー作成ガイド）
- [ ] テスト（複数APIキーでの動作確認）

---

## 🎓 ユーザー向けガイド

### 9. APIキー作成手順（ユーザー向け）

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com/

2. **新しいプロジェクトを作成**
   - プロジェクト名: 「UNIVERSEGEO-個人名」など

3. **Geocoding APIを有効化**
   - APIとサービス → ライブラリ
   - 「Geocoding API」を検索して有効化

4. **APIキーを作成**
   - APIとサービス → 認証情報
   - 「認証情報を作成」→「APIキー」

5. **APIキーの制限設定（推奨）**
   - アプリケーションの制限: HTTPリファラー
   - 許可するURL: `https://universegeo-*.run.app/*`
   - APIの制限: Geocoding APIのみ

6. **APIキーをコピー**
   - 作成されたAPIキーをコピー

7. **UNIVERSEGEOに登録**
   - ユーザー設定画面でAPIキーを貼り付け
   - 「保存」をクリック

---

## 📈 モニタリング

### 10. 使用量の可視化

管理者画面で各ユーザーのAPIキー使用状況を可視化：

- アクティブなAPIキー数
- 各APIキーの使用量
- 無料枠超過のAPIキー数
- 月間総使用量

---

## 注意事項

1. **APIキーの共有禁止**
   - 各ユーザーが自分のAPIキーを登録する必要がある
   - 他人のAPIキーを共有しない

2. **無料枠の上限**
   - 1つのAPIキーあたり月間40,000リクエストまで無料
   - 超過分は有料（$5.00/1,000リクエスト）

3. **月次リセット**
   - 毎月1日に使用量がリセットされる
   - リセット前に無料枠を超えたAPIキーは自動的に無効化される

4. **レート制限**
   - 1秒あたり50リクエストまで
   - バッチ処理時は適切な間隔を空ける

---

## 次のステップ

1. この実装方針をレビュー
2. 実装の優先順位を決定
3. 段階的な実装（まずは基本機能から）
4. ユーザーへの案内（APIキー登録の推奨）

