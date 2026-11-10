@echo off
title Conector Sage 50 - Reparto Tierra Nuestra
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ConectorSage.ps1" %*
echo.
pause
