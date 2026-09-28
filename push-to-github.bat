@echo off
echo ========================================================
echo   Uploading Apan Khata Code to GitHub Repository...
echo ========================================================
echo.
tools\git\cmd\git.exe push -u origin main --force
echo.
echo ========================================================
echo   Done! Check your GitHub page to see all folders.
echo ========================================================
pause
