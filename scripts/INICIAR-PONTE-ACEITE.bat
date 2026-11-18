@echo off
setlocal
title DRAFER ACEITE - INICIAR PONTE SIC
set "APP_DIR=C:\DRAFER\ACEITE-API"
set "PS1=%APP_DIR%\INICIAR-PONTE-ACEITE.ps1"
if not exist "%APP_DIR%" (
 echo [ERRO] Pasta da API ACEITE nao encontrada: %APP_DIR%
 pause
 exit /b 1
)
echo.
echo DRAFER ACEITE - INICIADOR DA PONTE SIC
echo A API Node permanece como esta.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $target='C:\DRAFER\ACEITE-API\INICIAR-PONTE-ACEITE.ps1'; $tmp=Join-Path $env:TEMP ('drafer-ponte-'+[guid]::NewGuid().ToString('N')+'.ps1'); try {Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/tigrupodrafer-app/ACEITE/704543489baebc4625b1cf39ffb9af9e3b39f049/scripts/INICIAR-PONTE-ACEITE.ps1' -OutFile $tmp -UseBasicParsing -TimeoutSec 30; $h=(& git hash-object -- $tmp).Trim(); if($LASTEXITCODE -ne 0 -or $h -ne '1957093bbdae2094faf24f66142cba89dd68c881'){throw 'Hash invalido do inicializador'}; Copy-Item $tmp $target -Force; Write-Host 'Inicializador validado.' -ForegroundColor Green} catch {Write-Host ('ERRO: '+$_.Exception.Message) -ForegroundColor Red; exit 1} finally {Remove-Item $tmp -Force -ErrorAction SilentlyContinue}"
if errorlevel 1 (
 echo [ERRO] Nao foi possivel verificar o inicializador. Nada foi iniciado.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
echo.
echo Finalizado. Confira o relatorio no Bloco de Notas.
pause
endlocal
