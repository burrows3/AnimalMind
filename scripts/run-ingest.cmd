@echo off
REM Run data ingest from repo root. Use with Task Scheduler for hourly autonomous runs.
set REPO_ROOT=%~dp0..
cd /d "%REPO_ROOT%"
node scripts\ingest-data-sources.js
if %ERRORLEVEL% equ 0 (
  echo %date% %time% ok >> memory\ingest.log
  node scripts\push-ingest-to-github.js
) else (echo %date% %time% FAIL >> memory\ingest.log)
