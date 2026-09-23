@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM ==========================================================
REM  LUNARIS - Derleme ve Yayin Betigi
REM  Kullanim:
REM    deploy.bat                 tam akis: testler + APK + deploy
REM    deploy.bat --skip-tests    dogrulama takimini atla
REM    deploy.bat --skip-apk      APK derlemeden yalnizca deploy et
REM    deploy.bat --hosting       yalnizca hosting deploy et
REM    deploy.bat --debug         firebase CLI ayrintili kayit
REM
REM  SIRA ONEMLI: APK once derlenmeli. Site footer'i /Lunaris.apk
REM  dosyasina baglaniyor ve build:apk bu dosyayi tazeliyor.
REM ==========================================================

set "SKIP_TESTS="
set "SKIP_APK="
set "DEPLOY_ARGS="
set "DEBUG_ARG="

:parse
if "%~1"=="" goto endparse
if /i "%~1"=="--skip-tests" set "SKIP_TESTS=1"
if /i "%~1"=="--skip-apk"   set "SKIP_APK=1"
if /i "%~1"=="--hosting"    set "DEPLOY_ARGS=--only hosting"
if /i "%~1"=="--debug"      set "DEBUG_ARG=--debug"
shift
goto parse
:endparse

set "LOGDIR=%~dp0.deploy-logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>nul

echo.
echo ===============================================================
echo   LUNARIS - DERLEME VE YAYIN
echo ===============================================================

REM ---------- 0. Gereksinimler ----------
echo.
echo [0/4] Gereksinimler kontrol ediliyor...

where node >nul 2>nul
if errorlevel 1 (
  echo   HATA: node bulunamadi. Node.js kurulu mu?
  goto :fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo   HATA: npm bulunamadi.
  goto :fail
)
if not exist "package.json" (
  echo   HATA: package.json yok. Bu betik proje kokunde calismali.
  goto :fail
)

set "VER=bilinmiyor"
for /f "delims=" %%v in ('node -p "require('./package.json').version" 2^>nul') do set "VER=%%v"
echo   Surum: v!VER!

if not defined SKIP_APK (
  where java >nul 2>nul
  if errorlevel 1 (
    echo   UYARI: java bulunamadi. Gradle derlemesi basarisiz olabilir.
  )
  if not exist "android\local.properties" (
    echo   UYARI: android\local.properties yok. Android SDK yolu tanimsiz olabilir.
  )
)

where firebase >nul 2>nul
if errorlevel 1 (
  echo   HATA: firebase CLI bulunamadi. Kurulum: npm i -g firebase-tools
  goto :fail
)
echo   Tamam.

REM ---------- 1. Dogrulama takimi ----------
echo.
if defined SKIP_TESTS (
  echo [1/4] Testler atlandi ^(--skip-tests^).
  goto :afterTests
)
echo [1/4] Dogrulama takimi calisiyor...

node scripts\scientific-validation.js > "%LOGDIR%\test-validation.log" 2>&1
if errorlevel 1 (
  echo   BASARISIZ: scientific-validation.js
  echo   ------------------------------------------------------------
  powershell -NoProfile -Command "Get-Content -Tail 25 '%LOGDIR%\test-validation.log'" 2>nul
  echo   ------------------------------------------------------------
  echo   Tam kayit: %LOGDIR%\test-validation.log
  goto :fail
)
echo   scientific-validation.js ... gecti

node scripts\verify-astrological-truth.js > "%LOGDIR%\test-truth.log" 2>&1
if errorlevel 1 (
  echo   BASARISIZ: verify-astrological-truth.js
  echo   ------------------------------------------------------------
  powershell -NoProfile -Command "Get-Content -Tail 25 '%LOGDIR%\test-truth.log'" 2>nul
  echo   ------------------------------------------------------------
  echo   Tam kayit: %LOGDIR%\test-truth.log
  goto :fail
)
echo   verify-astrological-truth.js ... gecti

:afterTests

REM ---------- 2. APK derleme ----------
echo.
if defined SKIP_APK (
  echo [2/4] APK derlemesi atlandi ^(--skip-apk^).
  if not exist "Lunaris.apk" (
    echo   UYARI: Lunaris.apk yok. Sitedeki indirme butonu 404 verecek.
  ) else (
    echo   UYARI: Mevcut Lunaris.apk yayinlanacak. Guncel oldugundan emin ol.
  )
  goto :afterApk
)
echo [2/4] APK derleniyor ^(npm run build:apk^)...
echo   Bu adim birkac dakika surebilir.
echo.

call npm run build:apk
if errorlevel 1 (
  echo.
  echo   HATA: APK derlemesi basarisiz. Deploy iptal edildi.
  echo   Yalnizca web yayinlamak istiyorsan: deploy.bat --skip-apk
  goto :fail
)

if not exist "Lunaris.apk" (
  echo.
  echo   HATA: Derleme bitti ama Lunaris.apk uretilmedi.
  goto :fail
)
echo.
echo   APK hazir: Lunaris.apk

:afterApk

REM ---------- 3. Surum damgasi + web varliklari ----------
echo.
echo [3/4] Surum damgalaniyor ve web varliklari senkronize ediliyor...
call node scripts\stamp-version.js
if errorlevel 1 (
  echo   HATA: stamp-version.js basarisiz.
  goto :fail
)
call node copy-web.js
if errorlevel 1 (
  echo   HATA: copy-web.js basarisiz.
  goto :fail
)

REM ---------- 4. Deploy ----------
echo.
echo [4/4] Firebase deploy...
echo.
REM Cikti hem ekrana hem kayda gitsin: deploy sessizce yarim kalirsa
REM tani koyacak tek sey bu kayit.
call firebase deploy %DEPLOY_ARGS% %DEBUG_ARG% > "%LOGDIR%\deploy.log" 2>&1
set "DEPLOY_ERR=%errorlevel%"
type "%LOGDIR%\deploy.log"
if not "%DEPLOY_ERR%"=="0" (
  echo.
  echo   HATA: firebase deploy basarisiz ^(cikis kodu %DEPLOY_ERR%^).
  echo   Tam kayit: %LOGDIR%\deploy.log
  echo   Oturum acik mi? Kontrol: firebase login:list
  goto :fail
)
findstr /C:"Deploy complete" "%LOGDIR%\deploy.log" >nul
if errorlevel 1 (
  echo.
  echo   UYARI: deploy hatasiz bitti ama "Deploy complete" satiri yok.
  echo   Yayin gerceklesmemis olabilir. Kayit: %LOGDIR%\deploy.log
)

echo.
echo ===============================================================
echo   BASARILI - v!VER! yayinda
echo ===============================================================
echo.
echo   Deploy sonrasi kontrol listesi:
echo     1. Sitede footer'daki "Android Icin Yukle" butonu dosyayi indiriyor mu
echo     2. Dogum haritasinda gezegenler birden fazla eve dagilmis mi
echo     3. Tarayicida sert yenile ^(Ctrl+F5^) - service worker surumu lunaris-v!VER!
echo.
endlocal
exit /b 0

:fail
echo.
echo ===============================================================
echo   ISLEM DURDURULDU - yayinlanmadi
echo ===============================================================
echo.
endlocal
exit /b 1
