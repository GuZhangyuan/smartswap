@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
set "NEXT_CMD=%PROJECT_ROOT%node_modules\.bin\next.cmd"

if not exist "%NEXT_CMD%" (
  echo node_modules was not found. Run npm install first.
  exit /b 1
)

call "%NEXT_CMD%" %*
