@echo off
REM One-click: create Windows scheduled task to run ingest every 1 hour.
REM Run this once (may need "Run as administrator" if you get access denied).
set REPO_ROOT=%~dp0..
set RUN_SCRIPT=%~dp0run-ingest.cmd
set TASK_NAME=AnimalMind Ingest

schtasks /create /tn "%TASK_NAME%" /tr "\"%RUN_SCRIPT%\"" /sc hourly /mo 1 /st 00:00 /f
if %ERRORLEVEL% equ 0 (
  echo Task "%TASK_NAME%" created. It will run every 1 hour.
  echo To run now: schtasks /run /tn "%TASK_NAME%"
  echo To remove:  schtasks /delete /tn "%TASK_NAME%" /f
) else (
  echo Failed to create task. Try right-click this script - Run as administrator.
  exit /b 1
)
