@echo off
cd /d "%~dp0"
SET PLAYWRIGHT_BROWSERS_PATH=%~dp0browsers

echo ============================================================
echo   RENOCAR Car Parts Scraper
echo ============================================================

IF NOT EXIST "browsers\" (
    echo.
    echo [First Run] Downloading browser engine ~150MB - internet required
    echo Please wait...
    echo.
    node\node.exe node_modules\playwright\cli.js install chromium
    echo.
)

echo.
echo Server starting... open http://localhost:3000 in your browser
echo Press Ctrl+C to stop.
echo.
node\node.exe dist\server.js
pause
