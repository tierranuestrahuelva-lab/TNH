<#
  Conector Sage 50 -> Reparto Tierra Nuestra
  SOLO LECTURA: lee albaranes de venta y clientes de la base de datos de Sage 50
  (SQL Server) y genera reparto-sage.json en el Escritorio. No modifica nada en Sage.
#>
param(
  [int]$Dias = 3,                 # albaranes de los últimos N días
  [string]$Servidor = '',         # vacío = buscar solo la instancia de Sage
  [string]$BaseDatos = '',        # vacío = la base de datos más reciente que tenga albaranes
  [string]$Salida = "$([Environment]::GetFolderPath('Desktop'))\reparto-sage.json",
  [string]$Usuario = '',          # usuario SQL de solo lectura (si no, el de Windows)
  [string]$Clave = '',
  [switch]$Explorar               # muestra instancias, bases y columnas (diagnóstico)
)
# conector.ini junto al script (opcional): Servidor=..., Usuario=..., Clave=..., BaseDatos=...
$ini = Join-Path $PSScriptRoot 'conector.ini'
if (Test-Path $ini) {
  foreach ($l in Get-Content $ini) {
    if ($l -match '^\s*(Servidor|Usuario|Clave|BaseDatos)\s*=\s*(.*?)\s*$') {
      if (-not (Get-Variable $matches[1] -ValueOnly)) { Set-Variable $matches[1] $matches[2] }
    }
  }
}
$ErrorActionPreference = 'Stop'

function Abrir($srv, $db) {
  $aut = if ($Usuario) { "User ID=$Usuario;Password=$Clave" } else { 'Integrated Security=True' }
  $cs = "Server=$srv;Database=$db;$aut;Connect Timeout=8;Application Name=ConectorRepartoTN;ApplicationIntent=ReadOnly"
  try { $c = New-Object System.Data.SqlClient.SqlConnection $cs; $c.Open(); return $c }
  catch {
    # con el nombre del servidor a veces falla la autenticación de Windows (SSPI); se reintenta por IP
    if ($srv -notmatch '^([^\\]+)(\\.*)?$' -or $matches[1] -match '^[\d.]+$|^\.$') { throw }
    $ip = [Net.Dns]::GetHostAddresses($matches[1]) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1
    if (-not $ip) { throw }
    $c = New-Object System.Data.SqlClient.SqlConnection ($cs -replace [regex]::Escape("Server=$srv;"), "Server=$($ip.IPAddressToString)$($matches[2]);"); $c.Open(); return $c
  }
}
function Consulta($con, $sql, $p = @{}) {
  $cmd = $con.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 60
  foreach ($k in $p.Keys) { [void]$cmd.Parameters.AddWithValue($k, $p[$k]) }
  $t = New-Object System.Data.DataTable; $t.Load($cmd.ExecuteReader()); ,$t
}
function Instancias {
  $l = @()
  foreach ($k in 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Microsoft SQL Server\Instance Names\SQL') {
    if (Test-Path $k) { (Get-ItemProperty $k).PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object { $l += $(if ($_.Name -eq 'MSSQLSERVER') { '.' } else { ".\$($_.Name)" }) } }
  }
  # servidor de Sage configurado en el puesto (Sage50Term\CONFIG.INI -> Sage50Serv\cfgclisrv.xml)
  foreach ($d in 'C:\Sage50\Sage50Term', 'D:\Sage50\Sage50Term') {
    $f = Join-Path $d 'CONFIG.INI'
    if (Test-Path $f) {
      $t = Get-Content $f; $i = [array]::IndexOf($t, '[SERVIDOR]')
      if ($i -ge 0) {
        $x = Join-Path $t[$i + 1] 'cfgclisrv.xml'
        if (Test-Path $x) { $ipSage = ([xml](Get-Content $x -Raw)).VFPData.cfgclisrv.ip; if ($ipSage) { $l += $ipSage } }
      }
    }
  }
  $l | Sort-Object { if ($_ -match 'SAGE') { 0 } else { 1 } } -Unique
}
function Columnas($con, $tabla) {
  $t = Consulta $con "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=@t" @{ '@t' = $tabla }
  @($t | ForEach-Object { $_.COLUMN_NAME.ToUpper() })
}
function Elegir($cols, [string[]]$candidatas) { foreach ($c in $candidatas) { if ($cols -contains $c) { return $c } }; $null }

# 1) localizar servidor y base de datos de Sage con albaranes de venta
$destinos = @()
$servs = if ($Servidor) { @($Servidor) } else { @(Instancias) }
if (-not $servs) { throw 'No encuentro el SQL Server de Sage 50. Indica el servidor en conector.ini (Servidor=SRVHP\SQLSAGE50).' }
foreach ($s in $servs) {
  try {
    $m = Abrir $s 'master'
    $dbs = Consulta $m "SELECT name, create_date FROM sys.databases WHERE database_id > 4 AND state = 0"
    foreach ($d in $dbs) {
      if ($BaseDatos -and $d.name -ne $BaseDatos) { continue }
      try {
        $x = Consulta $m "SELECT COUNT(*) n FROM [$($d.name)].INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('c_albven','C_ALBVEN')"
        if ($x.Rows[0].n -gt 0) { $destinos += [pscustomobject]@{ Servidor = $s; Base = $d.name; Creada = $d.create_date } }
      } catch {}
    }
    $m.Close()
  } catch { if ($Explorar) { Write-Host "No puedo entrar en $s : $($_.Exception.Message)" } }
}
if ($Explorar) { Write-Host "Instancias: $($servs -join ', ')"; $destinos | Format-Table | Out-String | Write-Host }
if (-not $destinos) { throw 'No encuentro la base de datos de Sage 50 con albaranes (tabla c_albven).' }
$dst = $destinos | Sort-Object { $_.Base } -Descending | Select-Object -First 1
if (-not $BaseDatos) {
  # la base del ejercicio actual suele empezar por el año
  $anio = (Get-Date).Year.ToString()
  $porAnio = $destinos | Where-Object { $_.Base -like "$anio*" } | Select-Object -First 1
  if ($porAnio) { $dst = $porAnio }
}
$con = Abrir $dst.Servidor $dst.Base

# 2) columnas disponibles (los nombres cambian algo entre versiones de Sage 50)
$cA = Columnas $con 'c_albven'; $cD = Columnas $con 'd_albven'; $cC = Columnas $con 'clientes'; $cE = Columnas $con 'env_cli'
if ($Explorar) { "c_albven: $($cA -join ', ')", "d_albven: $($cD -join ', ')", "clientes: $($cC -join ', ')", "env_cli: $($cE -join ', ')" | Write-Host; return }

$A = @{ num = Elegir $cA 'NUMERO'; letra = Elegir $cA 'LETRA','SERIE'; emp = Elegir $cA 'EMPRESA'; fecha = Elegir $cA 'FECHA'; cli = Elegir $cA 'CLIENTE'; env = Elegir $cA 'ENV_CLI','ENVIO'; total = Elegir $cA 'TOTALDOC','TOTAL','IMPORTE'; fpag = Elegir $cA 'FPAG','FORMAPAGO'; obs = Elegir $cA 'OBSERVACIO','OBSERVACIONES','OBS' }
$C = @{ cod = Elegir $cC 'CODIGO'; nom = Elegir $cC 'NOMBRE'; dir = Elegir $cC 'DIRECCION'; cp = Elegir $cC 'CODPOST','CODPOS','CP'; pob = Elegir $cC 'POBLACION'; tel = Elegir $cC 'TELEFONO','TELF','TELEFONO1','MOVIL' }
$E = @{ cli = Elegir $cE 'CLIENTE'; lin = Elegir $cE 'LINIA','LINEA','CODIGO'; nom = Elegir $cE 'NOMBRE'; dir = Elegir $cE 'DIRECCION'; cp = Elegir $cE 'CODPOS','CODPOST','CP'; pob = Elegir $cE 'POBLACION'; tel = Elegir $cE 'TELEFONO','TELF' }
$Dl = @{ num = Elegir $cD 'NUMERO'; letra = Elegir $cD 'LETRA','SERIE'; emp = Elegir $cD 'EMPRESA'; lin = Elegir $cD 'LINIA','LINEA'; art = Elegir $cD 'ARTICULO'; def = Elegir $cD 'DEFINICION','DESCRIPCION','NOMBRE'; uds = Elegir $cD 'UNIDADES','CANTIDAD' }
foreach ($k in 'num','fecha','cli') { if (-not $A[$k]) { throw "Falta la columna $k en c_albven. Ejecuta con -Explorar y envía el resultado." } }

$sel = @("a.[$($A.num)] AS numero", "a.[$($A.fecha)] AS fecha", "a.[$($A.cli)] AS cliente")
if ($A.letra) { $sel += "a.[$($A.letra)] AS letra" }; if ($A.emp) { $sel += "a.[$($A.emp)] AS empresa" }
if ($A.total) { $sel += "a.[$($A.total)] AS total" }; if ($A.obs) { $sel += "a.[$($A.obs)] AS obs" }; if ($A.fpag) { $sel += "a.[$($A.fpag)] AS fpag" }
foreach ($k in 'nom','dir','cp','pob','tel') { if ($C[$k]) { $sel += "c.[$($C[$k])] AS c_$k" } }
$joinEnv = ''
if ($A.env -and $E.cli -and $E.lin) {
  $joinEnv = "LEFT JOIN env_cli e ON e.[$($E.cli)] = a.[$($A.cli)] AND e.[$($E.lin)] = a.[$($A.env)]"
  foreach ($k in 'nom','dir','cp','pob','tel') { if ($E[$k]) { $sel += "e.[$($E[$k])] AS e_$k" } }
}
$sql = "SELECT $($sel -join ', ') FROM c_albven a LEFT JOIN clientes c ON c.[$($C.cod)] = a.[$($A.cli)] $joinEnv WHERE a.[$($A.fecha)] >= @desde ORDER BY a.[$($A.fecha)], a.[$($A.num)]"
$cab = Consulta $con $sql @{ '@desde' = (Get-Date).Date.AddDays(-$Dias) }

$lineas = @{}
if ($Dl.num -and $Dl.def) {
  $sl = @("d.[$($Dl.num)] AS numero", "d.[$($Dl.def)] AS def"); if ($Dl.letra) { $sl += "d.[$($Dl.letra)] AS letra" }; if ($Dl.emp) { $sl += "d.[$($Dl.emp)] AS empresa" }
  if ($Dl.art) { $sl += "d.[$($Dl.art)] AS art" }; if ($Dl.uds) { $sl += "d.[$($Dl.uds)] AS uds" }
  $on = "d.[$($Dl.num)] = a.[$($A.num)]"; if ($Dl.letra -and $A.letra) { $on += " AND d.[$($Dl.letra)] = a.[$($A.letra)]" }; if ($Dl.emp -and $A.emp) { $on += " AND d.[$($Dl.emp)] = a.[$($A.emp)]" }
  $ord = if ($Dl.lin) { "d.[$($Dl.lin)]" } else { '1' }
  $det = Consulta $con "SELECT $($sl -join ', ') FROM d_albven d JOIN c_albven a ON $on WHERE a.[$($A.fecha)] >= @desde ORDER BY $ord" @{ '@desde' = (Get-Date).Date.AddDays(-$Dias) }
  foreach ($r in $det) {
    $k = "$($r['empresa'])|$($r['letra'])|$("$($r.numero)".Trim())"
    if (-not $lineas[$k]) { $lineas[$k] = New-Object System.Collections.ArrayList }
    $u = if ($det.Columns.Contains('uds') -and $r.uds -isnot [DBNull]) { [double]$r.uds } else { '' }
    if ("$($r.def)".Trim() -or $u) { [void]$lineas[$k].Add([ordered]@{ codigo = if ($det.Columns.Contains('art')) { "$($r.art)".Trim() } else { '' }; nombre = "$($r.def)".Trim(); unidades = $u }) }
  }
}
$con.Close()

function V($r, $c) { if ($r.Table.Columns.Contains($c) -and $r[$c] -isnot [DBNull]) { "$($r[$c])".Trim() } else { '' } }
$alb = foreach ($r in $cab) {
  $emp = V $r 'empresa'; $letra = V $r 'letra'; $num = V $r 'numero'
  $usaEnv = (V $r 'e_dir') -ne ''
  $p = if ($usaEnv) { 'e_' } else { 'c_' }
  [ordered]@{
    id = "sage-$($dst.Base)-$emp-$letra-$num"; numero = (($letra, $num) | Where-Object { $_ }) -join '-'; fecha = ([datetime]$r.fecha).ToString('yyyy-MM-dd'); origen = 'sage'
    cliente = [ordered]@{ codigo = V $r 'cliente'; nombre = $(if ((V $r 'e_nom') -and $usaEnv) { V $r 'e_nom' } else { V $r 'c_nom' }); direccion = V $r "${p}dir"; cp = V $r "${p}cp"; poblacion = V $r "${p}pob"; telefono = $(if (V $r "${p}tel") { V $r "${p}tel" } else { V $r 'c_tel' }) }
    total = $(if ($r.Table.Columns.Contains('total') -and $r.total -isnot [DBNull]) { [double]$r.total } else { 0 })
    formaPago = V $r 'fpag'; obs = V $r 'obs'
    lineas = @($(if ($lineas["$emp|$letra|$num"]) { $lineas["$emp|$letra|$num"] } else { @() }))
    estado = 'pendiente'; repartidor = ''; orden = 0
  }
}
$doc = [ordered]@{ tipo = 'tn-reparto'; de = 'sage'; generado = (Get-Date).ToString('o'); base = $dst.Base; albaranes = @($alb) }
$json = $doc | ConvertTo-Json -Depth 6 -Compress
[IO.File]::WriteAllText($Salida, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Host "OK: $(@($alb).Count) albaranes de los últimos $Dias días -> $Salida"
