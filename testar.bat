@echo off
rem Instalacao SO PARA TESTE (duplo clique). Nao inicia com o Windows,
rem nao cria atalhos e nao mexe no firewall. Para remover, apague a pasta.
title ALX Auto Eletrica - TESTE
cd /d "%~dp0"

if not exist package.json (
  echo ERRO: coloque este arquivo na mesma pasta do package.json.
  goto fim
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado. Instale a versao LTS em https://nodejs.org
  echo e rode este arquivo de novo.
  goto fim
)
for /f "tokens=1 delims=." %%v in ('node -v') do set NODEMAIOR=%%v
set NODEMAIOR=%NODEMAIOR:v=%
if %NODEMAIOR% LSS 22 (
  echo ERRO: Node.js muito antigo. Instale a versao 22 ou mais nova em https://nodejs.org
  goto fim
)

echo.
echo [1/5] Instalando dependencias (alguns minutos; avisos amarelos sao normais)...
call npm install
if errorlevel 1 goto erro

if not exist backend\.env copy backend\.env.example backend\.env >nul

echo.
echo [2/5] Compilando...
call npm run build
if errorlevel 1 goto erro

echo.
echo [3/5] Preparando o banco de dados...
call npm run db:migrate
if errorlevel 1 goto erro

rem O seed so carrega exemplos se o banco estiver vazio; seguro rodar sempre
echo.
echo [4/5] Dados de exemplo (so se o banco estiver vazio)...
call npm run db:seed
if errorlevel 1 goto erro

echo.
echo [5/5] Iniciando. O navegador abre em alguns segundos.
echo       Deixe esta janela aberta. Para parar: Ctrl+C
echo.
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"
call npm start
goto fim

:erro
echo.
echo Algo deu errado no passo acima. Tire uma foto desta janela e envie.

:fim
echo.
pause
