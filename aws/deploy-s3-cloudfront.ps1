<#
.SYNOPSIS
  Deploy 3D Environmental Hacks Web App to AWS S3 & CloudFront
.DESCRIPTION
  Builds the production static bundle and uploads to S3, then invalidates CloudFront.
.PARAMETER BucketName
  The target AWS S3 bucket name
.PARAMETER DistributionId
  The CloudFront distribution ID to invalidate
#>
param(
  [Parameter(Mandatory=$false)]
  [string]$BucketName = "bharatbuilds-air-3d",

  [Parameter(Mandatory=$false)]
  [string]$DistributionId = ""
)

Write-Host "🚀 Step 1: Building production static web application..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Build failed! Aborting deployment." -ForegroundColor Red
  exit 1
}

Write-Host "📦 Step 2: Uploading dist/ to AWS S3 ($BucketName)..." -ForegroundColor Cyan
aws s3 sync dist/ "s3://$BucketName" --delete

if ($LASTEXITCODE -ne 0) {
  Write-Host "⚠️ Warning: AWS S3 sync encountered an issue. Ensure AWS CLI is configured (aws configure)." -ForegroundColor Yellow
} else {
  Write-Host "✅ S3 Upload complete!" -ForegroundColor Green
}

if ($DistributionId -ne "") {
  Write-Host "⚡ Step 3: Creating CloudFront cache invalidation ($DistributionId)..." -ForegroundColor Cyan
  aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
  Write-Host "✅ CloudFront invalidation created!" -ForegroundColor Green
}

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
