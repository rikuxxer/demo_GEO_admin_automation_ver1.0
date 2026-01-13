# テスト環境情報の表示スクリプト

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  テスト環境情報" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🌐 サービスURL" -ForegroundColor Yellow
Write-Host ""

Write-Host "【バックエンド（API）】" -ForegroundColor Green
Write-Host "  URL: https://universegeo-backend-223225164238.asia-northeast1.run.app"
Write-Host "  ヘルスチェック: https://universegeo-backend-223225164238.asia-northeast1.run.app/health"
Write-Host "  サービス名: universegeo-backend"
Write-Host "  リージョン: asia-northeast1"
Write-Host "  プロジェクト: univere-geo-demo"
Write-Host ""

Write-Host "【フロントエンド（Webアプリ）】" -ForegroundColor Green
Write-Host "  URL: https://universegeo-i5xw76aisq-an.a.run.app"
Write-Host "  サービス名: universegeo"
Write-Host "  リージョン: asia-northeast1"
Write-Host "  プロジェクト: univere-geo-demo"
Write-Host ""

Write-Host "🔍 GitHub Environment Secrets" -ForegroundColor Yellow
Write-Host "  環境名: Environment secrets"
Write-Host "  設定ページ: https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/Environment%20secrets"
Write-Host ""

Write-Host "⚠️  注意事項" -ForegroundColor Red
Write-Host "  現在、テスト環境と本番環境が同じ 'Environment secrets' を使用しています。"
Write-Host "  環境の分離が必要な場合は、別のEnvironmentを作成してください。"
Write-Host ""

Write-Host "📋 確認方法" -ForegroundColor Yellow
Write-Host "  1. フロントエンドにアクセス:"
Write-Host "     https://universegeo-i5xw76aisq-an.a.run.app"
Write-Host ""
Write-Host "  2. バックエンドAPIのヘルスチェック:"
Write-Host "     https://universegeo-backend-223225164238.asia-northeast1.run.app/health"
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan

