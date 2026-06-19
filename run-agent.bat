@echo off
setlocal

set ACTION=%1
if "%ACTION%"=="" set ACTION=full

set N8N_URL=http://localhost:5678/webhook/linkedin-agent

echo.
echo [LinkedIn Agent] Disparando accion: %ACTION%
echo URL: %N8N_URL%
echo.

curl -s -X POST %N8N_URL% ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"%ACTION%\"}"

echo.
echo [LinkedIn Agent] Accion ejecutada: %ACTION%
echo.
endlocal
