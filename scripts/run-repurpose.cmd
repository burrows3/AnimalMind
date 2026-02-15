@echo off
REM Run repurpose engine from repo root. Use with Task Scheduler for scheduled runs.
set REPO_ROOT=%~dp0..
cd /d "%REPO_ROOT%"
node scripts\repurpose-run.js
if %ERRORLEVEL% equ 0 (
  echo %date% %time% ok >> memory\repurpose.log
  node scripts\push-repurpose-to-github.js
) else (echo %date% %time% FAIL >> memory\repurpose.log)
