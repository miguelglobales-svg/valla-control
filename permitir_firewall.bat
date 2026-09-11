@echo off
title Habilitar Firewall para Vallas Control PWA

:: Comprobar si ya es Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    echo Solicitando permisos de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:admin
echo ========================================================
echo   Configurando Firewall de Windows para el Puerto 8080
echo ========================================================
echo.
netsh advfirewall firewall add rule name="Vallas PWA 8080" dir=in action=allow protocol=TCP localport=8080

echo.
echo ========================================================
echo  LISTO: Puerto 8080 permitido en el Firewall!
echo  Ahora tu celular ya podra acceder mediante:
echo  http://192.168.1.84:8080
echo ========================================================
echo.
pause
