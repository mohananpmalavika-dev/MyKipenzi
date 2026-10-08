# =================================================================
# Kipenzi Connect - Automated GCP Deployment Script
# Deploys to Google Cloud VM (kryptovision-server in asia-south1)
# =================================================================

$ErrorActionPreference = "Stop"

$Project = "project-7866fc3f-5dd5-4495-804"
$Zone = "asia-south1-b"
$Instance = "kryptovision-server"
$ImageTag = "asia-south1-docker.pkg.dev/$Project/kipenzi/kipenzi-connect:latest"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Deploying Kipenzi Connect to GCP" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Build and push Docker image
Write-Host "`n[1/3] Building & pushing container image to Artifact Registry..." -ForegroundColor Yellow
docker build -t $ImageTag .
if ($LASTEXITCODE -ne 0) { throw "Docker build failed!" }

docker push $ImageTag
if ($LASTEXITCODE -ne 0) { throw "Docker push failed!" }
Write-Host "✅ Image pushed successfully" -ForegroundColor Green

# 2. Pull on GCP VM and restart services
Write-Host "`n[2/3] Updating containers on GCP VM..." -ForegroundColor Yellow
$remoteCommand = "sudo docker pull $ImageTag && cd /opt/kipenzi && sudo docker container prune -f && sudo docker compose up -d --remove-orphans"
gcloud compute ssh $Instance --zone=$Zone --project=$Project --quiet --command=$remoteCommand
if ($LASTEXITCODE -ne 0) { throw "Remote deployment failed!" }

# 3. Health check
Write-Host "`n[3/3] Verifying deployment health..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$response = Invoke-RestMethod -Uri "https://kipenzi.34-14-220-41.sslip.io/api/health/ready" -Method Get
if ($response.status -eq "ok") {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "  ✅ Kipenzi Connect Deployed Successfully!" -ForegroundColor Green
    Write-Host "  URL: https://kipenzi.34-14-220-41.sslip.io" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "⚠️ Health check returned: $($response | ConvertTo-Json)" -ForegroundColor Yellow
}
