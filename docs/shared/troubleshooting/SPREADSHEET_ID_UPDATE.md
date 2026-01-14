# スプレッドシートIDの確認と更新

## 現在の状況

提供されたスプレッドシートURL:
```
https://docs.google.com/spreadsheets/d/17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s/edit?gid=0#gid=0
```

スプレッドシートID: `17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s`

ログに表示されていたスプレッドシートID: `18KSKhgXHjfU0f1pul629lOMe_wDRZ1Wy8JRP-CyqpNI`

**注意**: スプレッドシートIDが異なっています。

## 必要な対応

### ステップ1: GitHub Environment Secretsの確認

GitHub Environment Secretsの`GOOGLE_SPREADSHEET_ID`が正しいスプレッドシートIDを指しているか確認してください。

**正しいスプレッドシートID**: `17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s`

### ステップ2: スプレッドシートIDの更新（必要に応じて）

GitHub Environment Secretsで`GOOGLE_SPREADSHEET_ID`を更新：

1. GitHubリポジトリにアクセス
2. **Settings** > **Environments** > **production**（または使用している環境）
3. **Secrets and variables** > **Secrets**
4. `GOOGLE_SPREADSHEET_ID`を編集
5. 値を `17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s` に更新
6. **Update secret**をクリック

### ステップ3: スプレッドシートにサービスアカウントを共有

**重要**: このスプレッドシートにサービスアカウントを共有する必要があります。

1. スプレッドシートを開く: https://docs.google.com/spreadsheets/d/17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s/edit
2. 右上の**「共有」**ボタンをクリック
3. **「ユーザーやグループを追加」**の欄に、以下のメールアドレスを入力：
   ```
   223225164238-compute@developer.gserviceaccount.com
   ```
4. **権限**を**「編集者」**に設定
5. **「通知を送信しない」**にチェック
6. **「送信」**をクリック

### ステップ4: バックエンドの再デプロイ

GitHub Environment Secretsを更新した後、バックエンドを再デプロイ：

1. バックエンドのコードに変更を加える（例: `.deploy-trigger`ファイルを更新）
2. GitHub Actionsで自動デプロイが実行される
3. デプロイ完了を待つ

または、手動でデプロイをトリガー：

1. GitHubリポジトリの**Actions**タブを開く
2. **Deploy Backend to Cloud Run**ワークフローを選択
3. **Run workflow**をクリック
4. 環境を選択（`production`）
5. **Run workflow**をクリック

### ステップ5: 再度テストを実行

1. バックエンドが再デプロイされたことを確認
2. スプレッドシートにサービスアカウントが共有されていることを確認
3. `test-spreadsheet-export.html`で再度テストを実行
4. 成功することを確認

## 確認事項

- [ ] GitHub Environment Secretsの`GOOGLE_SPREADSHEET_ID`が正しいか確認
- [ ] スプレッドシートIDを更新（必要に応じて）
- [ ] スプレッドシートにサービスアカウントを共有（編集者権限）
- [ ] バックエンドを再デプロイ
- [ ] 再度テストを実行

## まとめ

1. **スプレッドシートIDの確認**: `17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s`
2. **サービスアカウントの共有**: `223225164238-compute@developer.gserviceaccount.com`に編集者権限を付与
3. **バックエンドの再デプロイ**: GitHub Environment Secretsを更新した後、再デプロイが必要

