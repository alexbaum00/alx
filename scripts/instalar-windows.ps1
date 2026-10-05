# Instalação do ALX Auto Elétrica no Windows.
# Rodado pelo instalar.bat. Pode ser executado de novo para atualizar.
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz
$porta = 3000

function Passo($texto) { Write-Host "`n==> $texto" -ForegroundColor Yellow }
function Ok($texto) { Write-Host "    $texto" -ForegroundColor Green }

# 1. Node.js 22 ou mais novo
Passo 'Verificando o Node.js'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host 'Node.js não encontrado. Instale a versão LTS em https://nodejs.org (ou: winget install OpenJS.NodeJS.LTS) e rode o instalar.bat de novo.' -ForegroundColor Red
  exit 1
}
$versao = (node -v).TrimStart('v')
if ([int]($versao.Split('.')[0]) -lt 22) {
  Write-Host "Node.js $versao é antigo; instale a versão 22 ou mais nova em https://nodejs.org" -ForegroundColor Red
  exit 1
}
Ok "Node.js $versao"

# 2. Dependências e configuração
Passo 'Instalando dependências (pode levar alguns minutos)'
npm install
if ($LASTEXITCODE -ne 0) { throw 'Falha no npm install' }
if (-not (Test-Path 'backend\.env')) {
  Copy-Item 'backend\.env.example' 'backend\.env'
  Ok 'Arquivo backend\.env criado'
}

# 3. Compilação e banco de dados (as migrações nunca apagam dados)
Passo 'Compilando o sistema'
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Falha na compilação' }
Passo 'Preparando o banco de dados'
npm run db:migrate
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar o banco' }

# 4. Firewall: libera a porta só em redes privadas (Wi-Fi de casa/oficina)
Passo "Liberando a porta $porta no firewall (redes privadas)"
if (Get-NetFirewallRule -DisplayName 'ALX Auto Eletrica' -ErrorAction SilentlyContinue) {
  Ok 'Regra já existe'
} else {
  Write-Host '    O Windows vai pedir permissão de administrador.'
  $comando = "New-NetFirewallRule -DisplayName 'ALX Auto Eletrica' -Direction Inbound -Protocol TCP -LocalPort $porta -Action Allow -Profile Private"
  try {
    Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile', '-Command', $comando
    Ok 'Regra criada'
  } catch {
    Write-Host '    Permissão negada; o celular não vai conseguir acessar até liberar a porta.' -ForegroundColor Red
  }
}

# 5. Atalhos: iniciar junto com o Windows e abrir pela área de trabalho
Passo 'Criando atalhos'
$shell = New-Object -ComObject WScript.Shell
$inicio = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'ALX Auto Eletrica.lnk'))
$inicio.TargetPath = Join-Path $raiz 'iniciar.bat'
$inicio.WorkingDirectory = $raiz
$inicio.WindowStyle = 7  # minimizado
$inicio.Save()
Ok 'Inicia sozinho quando o Windows liga'

$area = [Environment]::GetFolderPath('Desktop')
Set-Content -Path (Join-Path $area 'ALX Auto Eletrica.url') -Value "[InternetShortcut]`r`nURL=http://localhost:$porta/" -Encoding ASCII
Ok 'Atalho na área de trabalho'

Passo 'Pronto!'
Write-Host '    Iniciando o sistema agora. Na primeira vez, crie a senha no navegador deste computador.'
Start-Process -FilePath (Join-Path $raiz 'iniciar.bat') -WorkingDirectory $raiz -WindowStyle Minimized
Start-Sleep -Seconds 8
Start-Process "http://localhost:$porta/"
