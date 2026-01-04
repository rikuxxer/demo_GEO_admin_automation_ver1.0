# スプレッドシート書き出し機能のテストスクリプト（PowerShell版）

Write-Host "🧪 スプレッドシート書き出し機能のテスト" -ForegroundColor Cyan
Write-Host ""

# バックエンドのURLを取得
Write-Host "📋 バックエンドのURLを取得中..." -ForegroundColor Yellow
$BACKEND_URL = gcloud run services describe universegeo-backend `
  --region asia-northeast1 `
  --project univere-geo-demo `
  --format='value(status.url)' 2>$null

if ([string]::IsNullOrEmpty($BACKEND_URL)) {
  Write-Host "❌ エラー: バックエンドのURLを取得できませんでした" -ForegroundColor Red
  Write-Host "   gcloudコマンドが正しく設定されているか確認してください"
  exit 1
}

Write-Host "✅ バックエンドURL: $BACKEND_URL" -ForegroundColor Green
Write-Host ""

# 環境変数の確認
Write-Host "📋 環境変数の確認中..." -ForegroundColor Yellow
$GOOGLE_SPREADSHEET_ID = gcloud run services describe universegeo-backend `
  --region asia-northeast1 `
  --project univere-geo-demo `
  --format='value(spec.template.spec.containers[0].env[?name="GOOGLE_SPREADSHEET_ID"].value)' 2>$null

$GOOGLE_SHEETS_API_KEY = gcloud run services describe universegeo-backend `
  --region asia-northeast1 `
  --project univere-geo-demo `
  --format='value(spec.template.spec.containers[0].env[?name="GOOGLE_SHEETS_API_KEY"].value)' 2>$null

if ([string]::IsNullOrEmpty($GOOGLE_SPREADSHEET_ID)) {
  Write-Host "⚠️  警告: GOOGLE_SPREADSHEET_IDが設定されていません" -ForegroundColor Yellow
} else {
  Write-Host "✅ GOOGLE_SPREADSHEET_ID: 設定済み" -ForegroundColor Green
}

if ([string]::IsNullOrEmpty($GOOGLE_SHEETS_API_KEY)) {
  Write-Host "⚠️  警告: GOOGLE_SHEETS_API_KEYが設定されていません" -ForegroundColor Yellow
} else {
  Write-Host "✅ GOOGLE_SHEETS_API_KEY: 設定済み" -ForegroundColor Green
}

Write-Host ""

# テストデータの準備
Write-Host "📝 テストデータを準備中..." -ForegroundColor Yellow
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$date = Get-Date -Format "yyyy-MM-dd"

$testData = @{
  rows = @(
    @{
      半径 = "500"
      brand_name = "テストブランド"
      poi_id = "TEST-$timestamp"
      poi_name = "テスト地点（自動テスト）"
      latitude = "35.6812"
      longitude = "139.7671"
      prefecture = "東京都"
      city = "千代田区"
      setting_flag = "1"
      created = $date
    }
  )
} | ConvertTo-Json -Depth 10

Write-Host "テストデータ:"
Write-Host $testData
Write-Host ""

# APIリクエストを送信
Write-Host "📤 APIリクエストを送信中..." -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Uri "$BACKEND_URL/api/sheets/export" `
    -Method Post `
    -ContentType "application/json" `
    -Body $testData `
    -ErrorAction Stop

  Write-Host ""
  Write-Host "✅ 成功！" -ForegroundColor Green
  Write-Host "レスポンス:"
  $response | ConvertTo-Json -Depth 10
} catch {
  Write-Host ""
  Write-Host "❌ エラーが発生しました" -ForegroundColor Red
  Write-Host "エラーメッセージ: $($_.Exception.Message)"
  if ($_.ErrorDetails) {
    Write-Host "詳細: $($_.ErrorDetails.Message)"
  }
}

Write-Host ""
Write-Host "📋 次のステップ:" -ForegroundColor Cyan
Write-Host "1. スプレッドシートを開いて、データが追加されているか確認"
Write-Host "2. バックエンドのログを確認:"
Write-Host "   gcloud run services logs read universegeo-backend --region asia-northeast1 --project univere-geo-demo --limit 20"

