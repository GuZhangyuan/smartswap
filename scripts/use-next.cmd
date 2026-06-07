@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
set "LOCAL_BIN=%PROJECT_ROOT%\node_modules\.bin"

if not exist "%LOCAL_BIN%\next.cmd" (
  echo node_modules was not found. Run npm install first.
  exit /b 1
)

set "PATH=%LOCAL_BIN%;%PATH%"

if "%~1"=="" (
  echo SmartSwap local Next.js commands are ready.
  echo Try: next dev, next build, next start
  cmd /K
) else (
  %*
)
