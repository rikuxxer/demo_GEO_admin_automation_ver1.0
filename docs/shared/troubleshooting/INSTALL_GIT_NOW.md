# Git インストール手順（今すぐ実行）

Gitがインストールされていないため、以下の手順でインストールしてください。

## 方法1: wingetを使用（Windows 10/11、推奨）

PowerShellを**管理者として実行**して、以下を実行：

```powershell
winget install --id Git.Git -e --source winget
```

インストール後、**PowerShellを再起動**して確認：

```powershell
git --version
```

## 方法2: 公式インストーラー（確実）

1. ブラウザで以下にアクセス：
   - https://git-scm.com/download/win

2. 最新版をダウンロード（64-bit Git for Windows Setup）

3. インストーラーを実行し、以下の設定を選択：
   - ✅ **Git from the command line and also from 3rd-party software**（重要！）
   - その他はデフォルトのままでOK

4. インストール完了後、**PowerShellを再起動**

5. 確認：
   ```powershell
   git --version
   ```

## インストール後の確認

```powershell
# Gitのバージョン確認
git --version
# 例: git version 2.42.0.windows.2 と表示されればOK

# Gitの設定（初回のみ）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## インストール後も認識されない場合

1. **PowerShellを完全に閉じて再起動**
2. それでも認識されない場合、**PCを再起動**

## インストール後のGitHub Push手順

Gitがインストールされたら、以下を実行：

```powershell
# 1. リモートリポジトリを設定
git remote add origin https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git

# 2. 変更をステージング
git add .

# 3. コミット
git commit -m "Add backend API integration and GitHub Actions workflows"

# 4. Push
git push -u origin main
```

## 注意事項

- インストール中に「PATH環境変数に追加」のオプションを選択してください
- インストール後は必ずPowerShellを再起動してください
- それでも認識されない場合は、PCを再起動してください







