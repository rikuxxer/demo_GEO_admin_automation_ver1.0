# データセット universegeo_dataset を US で作成（create_all_tables.sql の前提）
# 実行: PowerShell で .\create-dataset-us.ps1

$ProjectId = "universe-geo-admin-dev-12246"
$DatasetId = "universegeo_dataset"
$Location = "US"

Write-Host "Project: $ProjectId"
Write-Host "Creating dataset: $DatasetId in location: $Location"

gcloud config set project $ProjectId
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

bq mk --dataset --location=$Location "${ProjectId}:${DatasetId}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed. If you see permission error, run: gcloud auth application-default login"
    exit $LASTEXITCODE
}

Write-Host "Done. Verifying..."
bq ls "${ProjectId}:"
Write-Host "Next: run create_all_tables.sql in BigQuery console or via bq query"
