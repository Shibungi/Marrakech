@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-quick-tunnel.ps1"
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Quick Tunnel startup failed with exit code %EXIT_CODE%.
)

exit /b %EXIT_CODE%