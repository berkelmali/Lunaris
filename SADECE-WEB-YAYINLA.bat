@echo off
REM Cift tiklanarak calistirilir: yalnizca web yayini.
REM APK yeniden derlenmez, firestore adimi atlanir.
cd /d "%~dp0"
call "%~dp0deploy.bat" --hosting --skip-apk
echo.
echo Pencereyi kapatmak icin bir tusa bas...
pause >nul
