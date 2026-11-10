@echo off
title Instalar sincronizacion Sage 50 - Tierra Nuestra
cd /d "%~dp0"
if not exist "%~dp0conector.ini" (
  echo Falta el archivo conector.ini en esta carpeta.
  pause & exit /b 1
)
echo Probando la conexion con Sage y con la app...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ConectorSage.ps1" -Subir
if errorlevel 1 (
  echo.
  echo ERROR: la prueba ha fallado. Haz una foto a esta ventana y mandasela a Devin.
  pause & exit /b 1
)
set TAREA=Tierra Nuestra - Sincronizar Sage
set ORDEN=powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0ConectorSage.ps1" -Subir
schtasks /Create /F /SC MINUTE /MO 5 /TN "%TAREA%" /RU SYSTEM /TR "%ORDEN:"=\"%" >nul 2>&1
if errorlevel 1 schtasks /Create /F /SC MINUTE /MO 5 /TN "%TAREA%" /TR "%ORDEN:"=\"%"
if errorlevel 1 (
  echo.
  echo ERROR: no se ha podido programar la sincronizacion. Haz una foto y mandasela a Devin.
  pause & exit /b 1
)
echo.
echo LISTO. Sage se copiara a la app cada 5 minutos, sin abrir ventanas.
echo No borres ni muevas esta carpeta. El historial queda en conector.log
pause
