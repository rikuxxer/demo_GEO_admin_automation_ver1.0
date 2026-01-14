# Git インストールガイド（Windows）

PowerShellで `git` コマンドが認識されない場合、Gitがインストールされていないか、PATHに含まれていない可能性があります。

## Gitのインストール確認

### 方法1: コマンドで確認

```powershell
# Gitがインストールされているか確認
where.exe git

# または
Get-Command git -ErrorAction SilentlyContinue
```

### 方法2: プログラム一覧で確認

1. **設定** > **アプリ** > **アプリと機能** を開く
2. "Git" で検索
3. Git for Windowsがインストールされているか確認

## Gitのインストール方法

### 方法1: 公式インストーラー（推奨）

1. [Git for Windows](https://git-scm.com/download/win) にアクセス
2. 最新版をダウンロード
3. インストーラーを実行
4. **重要**: インストール時に「Git from the command line and also from 3rd-party software」を選択

### 方法2: wingetを使用（Windows 10/11）

```powershell
# 管理者権限でPowerShellを開く
winget install --id Git.Git -e --source winget
```

### 方法3: Chocolateyを使用

```powershell
# Chocolateyがインストールされている場合
choco install git
```

## インストール後の確認

インストール後、**PowerShellを再起動**して以下を実行：

```powershell
# Gitのバージョンを確認
git --version

# 正常に表示されればOK
# 例: git version 2.42.0.windows.2
```

## インストール後も認識されない場合

### 1. PATH環境変数の確認

```powershell
# Gitのパスを確認
$env:PATH -split ';' | Select-String -Pattern 'git'

# Gitのインストールパス（通常）
# C:\Program Files\Git\cmd
# C:\Program Files (x86)\Git\cmd
```

### 2. PATHに手動で追加

```powershell
# 現在のユーザーのPATHに追加
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Program Files\Git\cmd",
    "User"
)

# PowerShellを再起動
```

### 3. システムの再起動

環境変数の変更を反映するため、PowerShellを再起動するか、システムを再起動してください。

## インストール後のGitHub Push手順

Gitがインストールされたら、以下の手順でGitHubにpushできます：

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

## 参考リンク

- [Git for Windows 公式サイト](https://git-scm.com/download/win)
- [Git 公式ドキュメント](https://git-scm.com/doc)







