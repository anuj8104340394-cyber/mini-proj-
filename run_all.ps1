# run_all.ps1 - Launch all 5 BMC and Twitter Clone services in separate background windows

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Launching BMC Civic Tech & Twitter Clone Services" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Start BMC FastAPI Backend
Write-Host "Starting BMC FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\Mini Proj\backend'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

# 2. Start Twitter Express Server
Write-Host "Starting Civic Twitter API Server on http://localhost:5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\clone twitter\server'; node src/server.js"

# 3. Start BMC Staff Dashboard
Write-Host "Starting BMC Staff Portal on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\Mini Proj\frontend'; npm run dev"

# 4. Start Citizen Portal
Write-Host "Starting BMC Citizen Portal on http://localhost:5174..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\Mini Proj\citizen-frontend'; npm run dev"

# 5. Start Twitter Web Client
Write-Host "Starting Civic Twitter Web App on http://localhost:5175..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\clone twitter\client'; npm run dev"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ✅ All 5 services launched in separate windows!" -ForegroundColor Cyan
Write-Host " - BMC Staff Dashboard:   http://localhost:5173" -ForegroundColor Yellow
Write-Host " - Citizen Portal:        http://localhost:5174" -ForegroundColor Yellow
Write-Host " - Twitter Web App:       http://localhost:5175" -ForegroundColor Yellow
Write-Host " - BMC API Swagger Docs:  http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host " - Twitter API Health:    http://localhost:5000/api/health" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
