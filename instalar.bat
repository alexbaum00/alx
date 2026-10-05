@echo off
rem Instala o ALX Auto Eletrica neste computador (duplo clique).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\instalar-windows.ps1"
pause
