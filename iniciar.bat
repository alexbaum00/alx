@echo off
rem Inicia o ALX Servicos Automotivos. Deixe esta janela aberta (pode minimizar).
title ALX Servicos Automotivos
cd /d "%~dp0"
call npm start
echo.
echo O sistema parou. Se apareceu um erro acima, tire uma foto da tela.
pause
