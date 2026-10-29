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
