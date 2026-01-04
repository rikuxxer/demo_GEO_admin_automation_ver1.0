# CORS Preflightテストスクリプト（PowerShell版）

param(
    [string]$BackendUrl = ""
)

Write-Host "🧪 CORS Preflightテスト" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrEmpty($BackendUrl)) {
    Write-Host "❌ エラー: バックエンドURLを指定してください" -ForegroundColor Red
    Write-Host "使用方法: .\test-cors-preflight.ps1 -BackendUrl <URL>"
    Write-Host "例: .\test-cors-preflight.ps1 -BackendUrl https://universegeo-backend-xxx-xx.a.run.app"
    exit 1
}

$apiUrl = "$BackendUrl/api/sheets/export"

Write-Host "📋 テスト設定:" -ForegroundColor Yellow
Write-Host "  URL: $apiUrl"
Write-Host ""

# テスト1: Origin: null でのpreflight
Write-Host "📤 テスト1: Origin: null でのpreflight" -ForegroundColor Yellow
Write-Host "----------------------------------------"
try {
    $response = Invoke-WebRequest -Uri $apiUrl `
        -Method Options `
        -Headers @{
            "Origin" = "null"
            "Access-Control-Request-Method" = "POST"
            "Access-Control-Request-Headers" = "content-type"
        } `
        -UseBasicParsing `
        -ErrorAction Stop

    Write-Host "✅ ステータスコード: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📋 レスポンスヘッダー:"
    $response.Headers | Format-Table
    Write-Host "Access-Control-Allow-Origin: $($response.Headers['Access-Control-Allow-Origin'])"
} catch {
    Write-Host "❌ エラー: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "ステータスコード: $($_.Exception.Response.StatusCode.value__)"
    }
}

Write-Host ""
Write-Host ""

# テスト2: localhost でのpreflight
Write-Host "📤 テスト2: localhost でのpreflight" -ForegroundColor Yellow
Write-Host "----------------------------------------"
try {
    $response = Invoke-WebRequest -Uri $apiUrl `
        -Method Options `
        -Headers @{
            "Origin" = "http://localhost:8000"
            "Access-Control-Request-Method" = "POST"
            "Access-Control-Request-Headers" = "content-type"
        } `
        -UseBasicParsing `
        -ErrorAction Stop

    Write-Host "✅ ステータスコード: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Access-Control-Allow-Origin: $($response.Headers['Access-Control-Allow-Origin'])"
} catch {
    Write-Host "❌ エラー: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# テスト3: 実際のPOSTリクエスト（Origin: null）
Write-Host "📤 テスト3: 実際のPOSTリクエスト（Origin: null）" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$testData = @{
    rows = @(
        @{
            半径 = "500"
            brand_name = "テストブランド"
            poi_id = "TEST-001"
            poi_name = "テスト地点"
            latitude = "35.6812"
            longitude = "139.7671"
            prefecture = "東京都"
            city = "千代田区"
            setting_flag = "1"
            created = "2024-01-01"
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $apiUrl `
        -Method Post `
        -Headers @{
            "Origin" = "null"
            "Content-Type" = "application/json"
        } `
        -Body $testData `
        -ErrorAction Stop

    Write-Host "✅ 成功！" -ForegroundColor Green
    Write-Host "レスポンス:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ エラー: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "レスポンス: $responseBody"
    }
}

Write-Host ""
Write-Host ""
Write-Host "✅ テスト完了" -ForegroundColor Green
Write-Host ""
Write-Host "📋 確認事項:" -ForegroundColor Cyan
Write-Host "1. OPTIONSリクエストで Access-Control-Allow-Origin ヘッダーが返っているか"
Write-Host "2. POSTリクエストが成功しているか（200 OK）"
Write-Host "3. エラーメッセージがないか"

