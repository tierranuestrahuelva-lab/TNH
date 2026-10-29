<#
  Diagnóstico Sage 50 (SOLO LECTURA): busca dónde guarda Sage los datos y deja
  diagnostico-sage.txt en el Escritorio para enviarlo a Devin. No modifica nada.
#>
$out = Join-Path ([Environment]::GetFolderPath('Desktop')) 'diagnostico-sage.txt'
$r = New-Object System.Collections.Generic.List[string]
function L($t) { $r.Add([string]$t); Write-Host $t }
L "Equipo: $env:COMPUTERNAME  Usuario: $env:USERNAME  Fecha: $(Get-Date)"
L '--- Servicios SQL ---'
Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'MSSQL*' -or $_.Name -like 'SQL*' } | ForEach-Object { L "$($_.Name) | $($_.Status) | $($_.DisplayName)" }
L '--- Instancias SQL (registro) ---'
$inst = @()
foreach ($k in 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Microsoft SQL Server\Instance Names\SQL') {
  if (Test-Path $k) { (Get-ItemProperty $k).PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object { L "$($_.Name) = $($_.Value)"; $inst += $(if ($_.Name -eq 'MSSQLSERVER') { '.' } else { ".\$($_.Name)" }) } }
}
L '--- Carpetas de Sage ---'
foreach ($p in 'C:\Program Files (x86)', 'C:\Program Files', 'C:\', 'D:\') {
  Get-ChildItem $p -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'Sage|Eurowin|Contaplus|Sage50' } | ForEach-Object { L $_.FullName }
}
L '--- Accesos directos de Sage ---'
foreach ($p in "$env:PUBLIC\Desktop", [Environment]::GetFolderPath('Desktop'), "$env:ProgramData\Microsoft\Windows\Start Menu\Programs") {
  Get-ChildItem $p -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'Sage' } | ForEach-Object {
    try { $t = (New-Object -ComObject WScript.Shell).CreateShortcut($_.FullName); L "$($_.Name) -> $($t.TargetPath) $($t.Arguments)" } catch { L $_.FullName }
  }
}
L '--- Unidades de red ---'
Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue | ForEach-Object { L "$($_.Name): $($_.DisplayRoot) $($_.Root)" }
L '--- Servidor de Sage (CONFIG.INI del puesto) ---'
$srvSage = @()
foreach ($ini in 'C:\Sage50\Sage50Term\CONFIG.INI', 'D:\Sage50\Sage50Term\CONFIG.INI') {
  if (Test-Path $ini) {
    $lin = Get-Content $ini
    for ($i = 0; $i -lt $lin.Count - 1; $i++) { if ($lin[$i] -match '^\[(SERVIDOR|SERVER|EMPRESA|COMUNES)\]') { L "$($lin[$i]) $($lin[$i+1])"; if ($lin[$i+1] -match '^\\\\([^\\]+)\\') { $srvSage += $matches[1] } } }
  }
}
foreach ($h in ($srvSage | Select-Object -Unique)) {
  foreach ($f in 'cfgclisrv.xml', 'terminal.xml', 'gruposemp.xml') {
    $x = "\\$h\Sage50Serv\$f"
    if (Test-Path $x) { L "== $x"; Get-Content $x -TotalCount 60 | ForEach-Object { L ($_ -replace '(?i)(pass\w*|pwd|contrase\w*)\s*[=>"]+[^<"]*', '$1=***') } }
  }
  $inst += "$h\SQLSAGE50"; $inst += $h; $inst += "$h\SQLEXPRESS"
}
L '--- Carpetas compartidas y NAS ---'
cmd /c "net use" 2>&1 | ForEach-Object { L $_ }
cmd /c "net view \\Nas-tn" 2>&1 | ForEach-Object { L $_ }
L '--- Configuración de Sage (servidor / base de datos) ---'
$dirs = @()
foreach ($p in 'C:\Program Files (x86)', 'C:\Program Files', 'C:\', 'D:\', 'C:\ProgramData', "$env:APPDATA", "$env:LOCALAPPDATA") {
  Get-ChildItem $p -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'Sage|Eurowin' } | ForEach-Object { $dirs += $_.FullName }
}
foreach ($d in $dirs) {
  Get-ChildItem $d -Recurse -Depth 3 -Include *.ini, *.config, *.xml, *.cfg, *.json -ErrorAction SilentlyContinue | Where-Object { $_.Length -lt 200kb } | ForEach-Object {
    $f = $_.FullName
    Select-String -Path $f -Pattern 'server|servidor|sql|data source|instanc|database|catalog|ruta|path' -ErrorAction SilentlyContinue | Select-Object -First 15 | ForEach-Object { L "$f : $($_.Line.Trim())" }
  }
}
L '--- Servidores SQL en la red ---'
try { [System.Data.Sql.SqlDataSourceEnumerator]::Instance.GetDataSources() | ForEach-Object { $n = if ($_.InstanceName) { "$($_.ServerName)\$($_.InstanceName)" } else { $_.ServerName }; L "$n (version $($_.Version))"; $inst += $n } } catch { L "No se pudo buscar en la red: $($_.Exception.Message)" }
L '--- Bases de datos y tablas de albaranes/clientes ---'
foreach ($s in ($inst | Select-Object -Unique)) {
  try {
    $c = New-Object System.Data.SqlClient.SqlConnection "Server=$s;Database=master;Integrated Security=True;Connect Timeout=8;ApplicationIntent=ReadOnly;Application Name=DiagnosticoRepartoTN"; $c.Open()
    $cmd = $c.CreateCommand(); $cmd.CommandText = 'SELECT name FROM sys.databases WHERE database_id > 4 AND state = 0'
    $t = New-Object System.Data.DataTable; $t.Load($cmd.ExecuteReader())
    foreach ($d in $t.Rows) {
      $db = $d.name
      try {
        $cmd.CommandText = "SELECT t.TABLE_NAME, STUFF((SELECT ',' + c.COLUMN_NAME FROM [$db].INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = t.TABLE_NAME FOR XML PATH('')), 1, 1, '') cols FROM [$db].INFORMATION_SCHEMA.TABLES t WHERE t.TABLE_NAME IN ('c_albven','d_albven','clientes','env_cli','articulo','c_pedive')"
        $x = New-Object System.Data.DataTable; $x.Load($cmd.ExecuteReader())
        L "BD $s / $db : $($x.Rows.Count) tablas de interés"
        foreach ($f in $x.Rows) { L "   $($f.TABLE_NAME): $($f.cols)" }
      } catch {
        try { $cmd.CommandText = "SELECT TABLE_NAME FROM [$db].INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('c_albven','clientes')"; $x = New-Object System.Data.DataTable; $x.Load($cmd.ExecuteReader()); L "BD $s / $db : $(@($x.Rows | ForEach-Object { $_.TABLE_NAME }) -join ',')" } catch { L "BD $s / $db : sin acceso ($($_.Exception.Message))" }
      }
    }
    $c.Close()
  } catch { L "No puedo entrar en $s : $($_.Exception.Message)" }
}
[IO.File]::WriteAllLines($out, $r, (New-Object System.Text.UTF8Encoding $true))
Write-Host ''
Write-Host "LISTO. Se ha creado en el Escritorio el archivo: diagnostico-sage.txt" -ForegroundColor Green
Write-Host 'Envíaselo a Devin en el chat.' -ForegroundColor Green
