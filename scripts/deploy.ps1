# Cloud Run デプロイスクリプト (Windows PowerShell)
# 使用方法: .\deploy.ps1

# 設定
$PROJECT_ID = "your-gcp-project-id"
$REGION = "asia-northeast1"
$SERVICE_NAME = "universegeo"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

# 環境変数を.envファイルから読み込む
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# 環境変数のチェック
$SPREADSHEET_ID = $env:VITE_GOOGLE_SPREADSHEET_ID
$API_KEY = $env:VITE_GOOGLE_SHEETS_API_KEY

if (-not $SPREADSHEET_ID -or -not $API_KEY) {
    Write-Host "❌ エラー: 環境変数が設定されていません" -ForegroundColor Red
    Write-Host "VITE_GOOGLE_SPREADSHEET_ID と VITE_GOOGLE_SHEETS_API_KEY を設定してください"
    exit 1
}

Write-Host "🚀 Cloud Run へのデプロイを開始します..." -ForegroundColor Cyan
Write-Host "📦 プロジェクト: $PROJECT_ID"
Write-Host "🌏 リージョン: $REGION"
Write-Host "📱 サービス名: $SERVICE_NAME"

# Dockerイメージをビルド
Write-Host "`n🔨 Dockerイメージをビルド中..." -ForegroundColor Yellow
docker build `
  --build-arg VITE_GOOGLE_SPREADSHEET_ID="$SPREADSHEET_ID" `
  --build-arg VITE_GOOGLE_SHEETS_API_KEY="$API_KEY" `
  -t ${IMAGE_NAME}:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Dockerイメージのビルドに失敗しました" -ForegroundColor Red
    exit 1
}

# Google Container Registryにプッシュ
Write-Host "`n📤 イメージをプッシュ中..." -ForegroundColor Yellow
docker push ${IMAGE_NAME}:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ イメージのプッシュに失敗しました" -ForegroundColor Red
    exit 1
}

# Cloud Runにデプロイ
Write-Host "`n🚀 Cloud Run にデプロイ中..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --image ${IMAGE_NAME}:latest `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --max-instances 10 `
  --project $PROJECT_ID

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nデプロイが完了しました。" -ForegroundColor Green
    Write-Host "サービスURL:" -ForegroundColor Cyan
    gcloud run services describe $SERVICE_NAME `
      --platform managed `
      --region $REGION `
      --format 'value(status.url)' `
      --project $PROJECT_ID
} else {
    Write-Host "デプロイに失敗しました。" -ForegroundColor Red
    exit 1
}







