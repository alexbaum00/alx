@echo off
rem Inicia o ALX Auto Eletrica. Deixe esta janela aberta (pode minimizar).
title ALX Auto Eletrica
cd /d "%~dp0"
call npm start
echo.
echo O sistema parou. Se apareceu um erro acima, tire uma foto da tela.
pause
