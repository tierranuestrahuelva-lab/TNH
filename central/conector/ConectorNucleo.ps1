<#
  Conector Sage 50 -> Núcleo Tierra Nuestra (SOLO LECTURA de Sage)
  Copia artículos, costes, stock, tarifas, clientes, pedidos de venta y compra pendientes,
  cartera de cobros y pagos y lotes a la base central. No escribe nada en Sage.
  Solo sube lo que ha cambiado; una vez al día (o con -Completa) hace copia completa.
#>
param([switch]$Completa, [int]$Lote = 1000)
$Version = '1.0'
$Servidor = ''; $Usuario = ''; $Clave = ''; $EquipoEmail = ''; $EquipoClave = ''
$Empresa = 'TC'; $BaseDatos = ''; $Comunes = 'COMU0001'; $Lotes = 'LOTES0TC'; $TarifaPVP = ''; $EmpresaCodigo = ''; $Reparto = 'si'
$SupabaseUrl = 'https://zxrrwwmxbvdlkalqzzau.supabase.co'
$SupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cnJ3d214YnZkbGthbHF6emF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzkxODQsImV4cCI6MjEwODg1NTE4NH0.IZltQVDiXx6QAYSwt5Lt6wGA8U0YRNlKvrICaTEUYh0'
$ini = Join-Path $PSScriptRoot 'conector.ini'
if (Test-Path $ini) {
  foreach ($l in [IO.File]::ReadAllLines($ini, [Text.Encoding]::UTF8)) {
    if ($l -match '^\s*(Servidor|Usuario|Clave|EquipoEmail|EquipoClave|Empresa|BaseDatos|Comunes|Lotes|TarifaPVP|EmpresaCodigo|Reparto|SupabaseUrl)\s*=\s*(.*?)\s*$') { Set-Variable $matches[1] $matches[2] }
  }
}
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$log = Join-Path $PSScriptRoot 'conector-nucleo.log'
$estado = Join-Path $PSScriptRoot 'estado'
if (-not (Test-Path $estado)) { New-Item -ItemType Directory $estado | Out-Null }
function Anotar($t) {
  if ((Test-Path $log) -and (Get-Item $log).Length -gt 2MB) { Remove-Item $log }
  Add-Content -Path $log -Value "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) $t" -Encoding UTF8
  Write-Host $t
}

# ---------- Sage (solo lectura) ----------
function Abrir($db) {
  $srv = if ($Servidor) { $Servidor } else { "$env:COMPUTERNAME\SQLSAGE50" }
  $aut = if ($Usuario) { "User ID=$Usuario;Password=$Clave" } else { 'Integrated Security=True' }
  $c = New-Object System.Data.SqlClient.SqlConnection "Server=$srv;Database=$db;$aut;Connect Timeout=15;Application Name=ConectorNucleoTN;ApplicationIntent=ReadOnly"
  $c.Open(); $c
}
function Q($sql, $p = @{}) {
  $cmd = $script:con.CreateCommand(); $cmd.CommandText = "SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED; $sql"; $cmd.CommandTimeout = 600
  foreach ($k in $p.Keys) { [void]$cmd.Parameters.AddWithValue($k, $p[$k]) }
  $t = New-Object System.Data.DataTable; [void](New-Object System.Data.SqlClient.SqlDataAdapter $cmd).Fill($t); , $t
}
function S($v) { if ($v -is [DBNull] -or $null -eq $v) { $null } else { $x = "$v".Trim(); if ($x) { $x } else { $null } } }
function N($v) { if ($v -is [DBNull] -or $null -eq $v) { $null } else { [math]::Round([double]$v, 4) } }
function F($v) { if ($v -is [DBNull] -or $null -eq $v -or ([datetime]$v).Year -lt 1901) { $null } else { ([datetime]$v).ToString('yyyy-MM-dd') } }
function B($v) { if ($v -is [DBNull] -or $null -eq $v) { $false } else { [bool]$v } }

# ---------- Base central ----------
$H = @{ apikey = $SupabaseKey }
function Entrar {
  $cred = @{ email = $EquipoEmail; password = $EquipoClave } | ConvertTo-Json
  $t = Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/auth/v1/token?grant_type=password" -Headers @{ apikey = $SupabaseKey } -ContentType 'application/json' -Body $cred
  $script:H = @{ apikey = $SupabaseKey; Authorization = "Bearer $($t.access_token)" }
}
function Rpc($fn, $datos) {
  $json = ConvertTo-Json -InputObject $datos -Depth 8 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  for ($i = 1; ; $i++) {
    try { return Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/rest/v1/rpc/$fn" -Headers $script:H -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 300 }
    catch {
      $msg = $_.Exception.Message; try { $msg += ' ' + (New-Object IO.StreamReader $_.Exception.Response.GetResponseStream()).ReadToEnd() } catch {}
      if ($i -ge 3) { throw "Base central ($fn): $msg" }
      Start-Sleep -Seconds (5 * $i); if ($msg -match '401|JWT') { Entrar }
    }
  }
}
$md5 = [Security.Cryptography.MD5]::Create()
function Huella($fila) {
  $p = foreach ($v in $fila.Values) { if ($v -is [array] -or $v -is [Collections.IList]) { ConvertTo-Json -InputObject $v -Depth 5 -Compress } else { "$v" } }
  [BitConverter]::ToString($md5.ComputeHash([Text.Encoding]::UTF8.GetBytes(($p -join [char]30)))).Replace('-', '')
}
$resumen = [ordered]@{}
function Sincronizar($tabla, $filas, [string[]]$pk) {
  $sep = [string][char]31
  $fich = Join-Path $estado "$tabla.txt"
  $antes = New-Object 'System.Collections.Generic.Dictionary[string,string]'
  $completa = $script:Completa -or -not (Test-Path $fich)
  if (-not $completa) { foreach ($l in [IO.File]::ReadAllLines($fich)) { $x = $l.Split("`t"); if ($x.Count -eq 2) { $antes[$x[0]] = $x[1] } } }
  $ahora = New-Object 'System.Collections.Generic.Dictionary[string,string]'
  $cambios = New-Object System.Collections.ArrayList
  foreach ($f in $filas) {
    $k = ($pk | ForEach-Object { "$($f[$_])" }) -join $sep
    if ($ahora.ContainsKey($k)) { continue }
    $h = Huella $f; $ahora[$k] = $h
    if ($completa -or -not $antes.ContainsKey($k) -or $antes[$k] -ne $h) { [void]$cambios.Add($f) }
  }
  $borrar = New-Object System.Collections.ArrayList
  if (-not $completa) {
    foreach ($k in $antes.Keys) { if (-not $ahora.ContainsKey($k)) { $o = [ordered]@{}; $v = $k.Split($sep); for ($i = 0; $i -lt $pk.Count; $i++) { $o[$pk[$i]] = $v[$i] }; [void]$borrar.Add($o) } }
  }
  $inicio = $null
  if ($completa) { $inicio = (Rpc 'tn_sage_subir' @{ p_tabla = $tabla }).ahora }
  for ($i = 0; $i -lt $cambios.Count; $i += $Lote) {
    $trozo = $cambios.GetRange($i, [math]::Min($Lote, $cambios.Count - $i))
    [void](Rpc 'tn_sage_subir' @{ p_tabla = $tabla; p_filas = @($trozo) })
  }
  for ($i = 0; $i -lt $borrar.Count; $i += $Lote) {
    [void](Rpc 'tn_sage_subir' @{ p_tabla = $tabla; p_borrar = @($borrar.GetRange($i, [math]::Min($Lote, $borrar.Count - $i))) })
  }
  $pur = 0
  if ($completa) { $pur = (Rpc 'tn_sage_subir' @{ p_tabla = $tabla; p_purgar_antes = $inicio }).purgadas }
  $sb = New-Object Text.StringBuilder
  foreach ($k in $ahora.Keys) { [void]$sb.Append($k).Append("`t").Append($ahora[$k]).Append("`n") }
  [IO.File]::WriteAllText($fich, $sb.ToString())
  $script:resumen[$tabla] = [ordered]@{ filas = $ahora.Count; subidas = $cambios.Count; borradas = $borrar.Count + $pur }
}

$t0 = Get-Date
$info = [ordered]@{ equipo = $env:COMPUTERNAME; version = $Version }
try {
  if (-not $EquipoClave) { throw 'Falta EquipoClave en conector.ini' }
  $marca = Join-Path $estado 'completa.txt'
  if (-not (Test-Path $marca) -or ((Get-Date) - (Get-Item $marca).LastWriteTime).TotalHours -ge 24) { $Completa = $true }

  # 0) albaranes para Reparto (conector anterior), si está en la carpeta
  $rep = Join-Path $PSScriptRoot 'ConectorSage.ps1'
  if ($Reparto -eq 'si' -and (Test-Path $rep)) {
    try { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $rep -Subir | Out-Null } catch { Anotar "Aviso reparto: $($_.Exception.Message)" }
  }

  # 1) base del ejercicio actual
  $script:con = Abrir 'master'
  if (-not $BaseDatos) {
    $bases = Q "SELECT name FROM sys.databases WHERE state = 0 AND name LIKE '[12][0-9][0-9][0-9]' + @e ORDER BY name DESC" @{ '@e' = $Empresa }
    foreach ($b in $bases) { $n = (Q "SELECT COUNT(*) n FROM [$($b.name)].sys.tables WHERE name = 'articulo'").Rows[0].n; if ($n -gt 0) { $BaseDatos = $b.name; break } }
  }
  if (-not $BaseDatos) { throw "No encuentro la base de Sage del ejercicio (empresa $Empresa)" }
  $script:con.Close(); $script:con = Abrir $BaseDatos
  if (-not $EmpresaCodigo) {
    $x = Q "SELECT TOP 1 empresa FROM (SELECT empresa FROM c_albven UNION ALL SELECT empresa FROM c_pedive UNION ALL SELECT empresa FROM stocks) t GROUP BY empresa ORDER BY COUNT(*) DESC"
    $EmpresaCodigo = if ($x.Rows.Count) { "$($x.Rows[0].empresa)".Trim() } else { '' }
  }
  $E = @{ '@e' = $EmpresaCodigo }
  $info.base = $BaseDatos; $info.empresa = $EmpresaCodigo
  Entrar

  # 2) maestros
  $tar = Q "SELECT codigo, nombre FROM tarifas"
  if (-not $TarifaPVP) {
    $p = $tar | Where-Object { "$($_.nombre)" -match 'P\.?V\.?P|P[UÚ]BLICO|TIENDA' } | Select-Object -First 1
    $TarifaPVP = if ($p) { "$($p.codigo)".Trim() } elseif ($tar.Rows.Count) { "$(($tar | Sort-Object codigo | Select-Object -First 1).codigo)".Trim() } else { '' }
  }
  $info.tarifa_pvp = $TarifaPVP
  $m = foreach ($par in @(@('vendedor', 'vendedor'), @('tarifa', 'tarifas'), @('almacen', 'almacen'), @('familia', 'familias'), @('marca', 'marcas'), @('ruta', 'rutas'))) {
    foreach ($r in (Q "SELECT * FROM [$($par[1])]")) { $c = S $r.codigo; if ($c) { [ordered]@{ tipo = $par[0]; cod = $c; nombre = $(if ($r.Table.Columns.Contains('nombre')) { S $r.nombre } else { $null }) } } }
  }
  Sincronizar 'sage_maestros' @($m) @('tipo', 'cod')

  # 3) artículos, costes, tarifas
  $vig = "CASE WHEN (fechaini IS NULL OR fechaini <= GETDATE()) AND (fechafin IS NULL OR fechafin < '19010101' OR fechafin >= CAST(GETDATE() AS date)) THEN 0 ELSE 1 END, fechaini DESC"
  $arts = Q "SELECT a.codigo, a.nombre, a.familia, a.marca, a.baja, a.ubicacion, a.tipo_iva, a.cost_ult1, a.pmcom1, (SELECT MIN(b.barras) FROM barras b WHERE b.articulo = a.codigo) ean, p.pvp, p.pvpiva FROM articulo a OUTER APPLY (SELECT TOP 1 pvp, pvpiva FROM pvp WHERE articulo = a.codigo AND tarifa = @t ORDER BY $vig) p WHERE LTRIM(a.codigo) <> ''" @{ '@t' = $TarifaPVP }
  $fa = foreach ($r in $arts) { $pv = N $r.pvp; [ordered]@{ cod = S $r.codigo; nombre = $(if (S $r.nombre) { S $r.nombre } else { S $r.codigo }); familia = S $r.familia; marca = S $r.marca; pvp = $pv; baja = B $r.baja; ean = S $r.ean; ubicacion = S $r.ubicacion; iva = S $r.tipo_iva } }
  Sincronizar 'sage_articulos' @($fa) @('cod')
  $fc = foreach ($r in $arts) { $c = N $r.cost_ult1; if (-not $c) { $c = N $r.pmcom1 }; if ($c) { [ordered]@{ cod = S $r.codigo; coste = $c } } }
  Sincronizar 'sage_costes' @($fc) @('cod')
  $ft = foreach ($r in (Q "SELECT articulo, tarifa, pvp, pvpiva FROM (SELECT articulo, tarifa, pvp, pvpiva, ROW_NUMBER() OVER (PARTITION BY articulo, tarifa ORDER BY $vig) rn FROM pvp) x WHERE rn = 1 AND pvp <> 0 AND articulo IN (SELECT codigo FROM articulo WHERE baja = 0)")) {
    [ordered]@{ cod = S $r.articulo; tarifa = S $r.tarifa; precio = N $r.pvp; precio_iva = N $r.pvpiva } }
  Sincronizar 'sage_tarifas' @($ft) @('cod', 'tarifa')

  # 4) stock por almacén (última fila de cada artículo/almacén/talla/color)
  $fs = foreach ($r in (Q "SELECT s.articulo, s.almacen, SUM(s.final) stock, MAX(COALESCE(m.minimo, a.minimo)) minimo FROM (SELECT articulo, almacen, final, ROW_NUMBER() OVER (PARTITION BY articulo, almacen, talla, color ORDER BY fecha DESC) rn FROM stocks WHERE empresa = @e) s LEFT JOIN stoalmmm m ON m.articulo = s.articulo AND m.almacen = s.almacen AND m.minimo <> 0 LEFT JOIN articulo a ON a.codigo = s.articulo WHERE s.rn = 1 GROUP BY s.articulo, s.almacen" $E)) {
    $st = N $r.stock; $mi = N $r.minimo
    if ($st -or $mi) { [ordered]@{ cod = S $r.articulo; almacen = "$(S $r.almacen)"; stock = $(if ($st) { $st } else { 0 }); minimo = $mi } } }
  Sincronizar 'sage_stock' @($fs) @('cod', 'almacen')

  # 5) clientes
  $fcl = foreach ($r in (Q "SELECT c.codigo, c.nombre, c.cif, c.poblacion, c.tarifa, c.vendedor, c.ruta, (SELECT TOP 1 t.telefono FROM telf_cli t WHERE t.cliente = c.codigo ORDER BY t.orden DESC, t.linea) tel FROM clientes c WHERE LTRIM(c.codigo) <> ''")) {
    [ordered]@{ cod = S $r.codigo; nombre = $(if (S $r.nombre) { S $r.nombre } else { S $r.codigo }); nif = S $r.cif; poblacion = S $r.poblacion; telefono = S $r.tel; tarifa = S $r.tarifa; agente = S $r.vendedor; ruta = S $r.ruta } }
  Sincronizar 'sage_clientes' @($fcl) @('cod')

  # 6) pedidos pendientes de venta y de compra
  $lv = @{}
  foreach ($r in (Q "SELECT d.letra, d.numero, d.articulo, d.definicion, d.unidades, d.servidas, d.precio, d.importe FROM d_pedive d JOIN c_pedive c ON c.empresa = d.empresa AND c.numero = d.numero AND c.letra = d.letra WHERE c.empresa = @e AND ISNULL(c.traspasado, 0) = 0 AND ISNULL(c.cancelado, 0) = 0 AND ISNULL(c.finalizado, 0) = 0 ORDER BY d.linia" $E)) {
    $k = "$(S $r.letra)|$(S $r.numero)"; if (-not $lv[$k]) { $lv[$k] = New-Object System.Collections.ArrayList }
    [void]$lv[$k].Add([ordered]@{ art = S $r.articulo; nombre = S $r.definicion; uds = N $r.unidades; servidas = N $r.servidas; precio = N $r.precio; importe = N $r.importe }) }
  $fd = New-Object System.Collections.ArrayList
  foreach ($r in (Q "SELECT c.letra, c.numero, c.fecha, c.entrega, c.cliente, cl.nombre, c.vendedor, c.totaldoc, c.totalped, c.refercli FROM c_pedive c LEFT JOIN clientes cl ON cl.codigo = c.cliente WHERE c.empresa = @e AND ISNULL(c.traspasado, 0) = 0 AND ISNULL(c.cancelado, 0) = 0 AND ISNULL(c.finalizado, 0) = 0" $E)) {
    $k = "$(S $r.letra)|$(S $r.numero)"; $li = @(); if ($lv[$k]) { $li = @($lv[$k]) }
    $parc = @($li | Where-Object { $_.servidas -gt 0 }).Count -gt 0
    $tot = N $r.totaldoc; if (-not $tot) { $tot = N $r.totalped }
    [void]$fd.Add([ordered]@{ id = "PV-$(S $r.letra)-$(S $r.numero)"; tipo = 'pedido_venta'; numero = (@((S $r.letra), (S $r.numero)) | Where-Object { $_ }) -join '/'; fecha = F $r.fecha; entrega = F $r.entrega; tercero = S $r.cliente; tercero_nombre = S $r.nombre; agente = S $r.vendedor; total = $tot; pendiente = $true; estado = $(if ($parc) { 'parcial' } else { 'pendiente' }); ref = S $r.refercli; lineas = $li }) }
  $lc = @{}
  foreach ($r in (Q "SELECT d.numero, d.articulo, d.definicion, d.unidades, d.servidas, d.precio, d.importe FROM d_pedico d JOIN c_pedico c ON c.empresa = d.empresa AND c.numero = d.numero WHERE c.empresa = @e AND ISNULL(c.traspasado, 0) = 0 AND ISNULL(c.cancelado, 0) = 0 ORDER BY d.linia" $E)) {
    $k = S $r.numero; if (-not $lc[$k]) { $lc[$k] = New-Object System.Collections.ArrayList }
    [void]$lc[$k].Add([ordered]@{ art = S $r.articulo; nombre = S $r.definicion; uds = N $r.unidades; servidas = N $r.servidas; precio = N $r.precio; importe = N $r.importe }) }
  foreach ($r in (Q "SELECT c.numero, c.fecha, c.entrega, c.proveedor, p.nombre, c.totaldoc, c.totalped FROM c_pedico c LEFT JOIN proveed p ON p.codigo = c.proveedor WHERE c.empresa = @e AND ISNULL(c.traspasado, 0) = 0 AND ISNULL(c.cancelado, 0) = 0" $E)) {
    $li = @(); if ($lc[(S $r.numero)]) { $li = @($lc[(S $r.numero)]) }
    $tot = N $r.totaldoc; if (-not $tot) { $tot = N $r.totalped }
    [void]$fd.Add([ordered]@{ id = "PC-$(S $r.numero)"; tipo = 'pedido_compra'; numero = S $r.numero; fecha = F $r.fecha; entrega = F $r.entrega; tercero = S $r.proveedor; tercero_nombre = S $r.nombre; agente = $null; total = $tot; pendiente = $true; estado = 'pendiente'; ref = $null; lineas = $li }) }
  Sincronizar 'sage_documentos' @($fd) @('id')

  # 7) cartera: cobros y pagos sin cobrar/pagar (base común de Sage)
  $fca = New-Object System.Collections.ArrayList
  foreach ($r in (Q "SELECT v.cliente, cl.nombre, ISNULL(NULLIF(v.vendedor, ''), cl.vendedor) agente, v.factura, v.orden, v.pejercici, v.vencim, v.importe, v.impagado FROM [$Comunes].dbo.previ_cl v LEFT JOIN clientes cl ON cl.codigo = v.cliente WHERE v.empresa = @e AND v.cobro IS NULL AND v.importe <> 0" $E)) {
    [void]$fca.Add([ordered]@{ id = "C-$(S $r.pejercici)-$(S $r.cliente)-$(S $r.factura)-$(S $r.orden)"; tipo = 'cobro'; tercero = S $r.cliente; tercero_nombre = S $r.nombre; agente = S $r.agente; documento = S $r.factura; vencimiento = F $r.vencim; importe = N $r.importe; pendiente = N $r.importe }) }
  foreach ($r in (Q "SELECT v.proveedor, p.nombre, v.factura, v.numereb, v.periodo, v.vencim, v.importe FROM [$Comunes].dbo.previs v LEFT JOIN proveed p ON p.codigo = v.proveedor WHERE v.empresa = @e AND v.pago IS NULL AND v.importe <> 0" $E)) {
    [void]$fca.Add([ordered]@{ id = "P-$(S $r.periodo)-$(S $r.proveedor)-$(S $r.factura)-$(S $r.numereb)"; tipo = 'pago'; tercero = S $r.proveedor; tercero_nombre = S $r.nombre; agente = $null; documento = S $r.factura; vencimiento = F $r.vencim; importe = N $r.importe; pendiente = N $r.importe }) }
  Sincronizar 'sage_cartera' @($fca) @('id')

  # 8) lotes con existencias (trazabilidad)
  $fl = foreach ($r in (Q "SELECT articulo, almacen, lote, ubica, MAX(caducidad) caducidad, SUM(unidades) u FROM [$Lotes].dbo.stocklotes WHERE empresa = @e GROUP BY articulo, almacen, lote, ubica HAVING SUM(unidades) <> 0" $E)) {
    [ordered]@{ cod = S $r.articulo; almacen = "$(S $r.almacen)"; lote = "$(S $r.lote)"; ubica = "$(S $r.ubica)"; caducidad = F $r.caducidad; unidades = N $r.u } }
  Sincronizar 'sage_lotes' @($fl) @('cod', 'almacen', 'lote', 'ubica')

  # 9) diagnóstico (solo recuentos) para revisar desde la Central
  $d = [ordered]@{}
  $d.stocks = (Q "SELECT empresa, COUNT(*) filas, COUNT(DISTINCT articulo + '|' + almacen + '|' + ISNULL(talla, '') + '|' + ISNULL(color, '')) claves, COUNT(DISTINCT fecha) fechas FROM stocks GROUP BY empresa") | ForEach-Object { "$(S $_.empresa): $($_.filas) filas, $($_.claves) claves, $($_.fechas) fechas" }
  $d.pedive = (Q "SELECT empresa, ISNULL(traspasado, 0) t, ISNULL(cancelado, 0) c, ISNULL(finalizado, 0) f, COUNT(*) n FROM c_pedive GROUP BY empresa, traspasado, cancelado, finalizado") | ForEach-Object { "$(S $_.empresa) t$([int]$_.t) c$([int]$_.c) f$([int]$_.f): $($_.n)" }
  $d.previ_cl = (Q "SELECT empresa, COUNT(*) n, SUM(CASE WHEN cobro IS NULL THEN 1 ELSE 0 END) sin_cobro, SUM(CASE WHEN cobro IS NULL AND vencim < DATEADD(year, -2, GETDATE()) THEN 1 ELSE 0 END) antiguos, SUM(CASE WHEN cobro IS NULL AND ISNULL(remesa, 0) <> 0 THEN 1 ELSE 0 END) remesados FROM [$Comunes].dbo.previ_cl GROUP BY empresa") | ForEach-Object { "$(S $_.empresa): $($_.n) total, $($_.sin_cobro) sin cobro, $($_.antiguos) de hace >2 años, $($_.remesados) remesados" }
  $d.previs = (Q "SELECT empresa, ISNULL(pagada, '') pagada, COUNT(*) n, SUM(CASE WHEN pago IS NULL THEN 1 ELSE 0 END) sin_pago FROM [$Comunes].dbo.previs GROUP BY empresa, pagada") | ForEach-Object { "$(S $_.empresa) pagada='$(S $_.pagada)': $($_.n), sin fecha pago $($_.sin_pago)" }
  $d.lotes = (Q "SELECT empresa, COUNT(*) n FROM [$Lotes].dbo.stocklotes GROUP BY empresa") | ForEach-Object { "$(S $_.empresa): $($_.n)" }
  $script:con.Close()

  $info.modo = $(if ($Completa) { 'completa' } else { 'cambios' })
  $info.segundos = [int]((Get-Date) - $t0).TotalSeconds
  $info.tablas = $resumen; $info.diag = $d
  Rpc 'tn_sage_latido' @{ p_info = $info } | Out-Null
  if ($Completa) { Set-Content $marca (Get-Date).ToString('o') }
  Anotar ("OK $($info.modo) $BaseDatos/$EmpresaCodigo en $($info.segundos) s: " + (($resumen.Keys | ForEach-Object { "$_ $($resumen[$_].filas) ($($resumen[$_].subidas) subidas)" }) -join ', '))
} catch {
  $err = $_.Exception.Message
  Anotar "ERROR $err"
  try { if (-not $script:H.Authorization) { Entrar }; $info.error = $err; Rpc 'tn_sage_latido' @{ p_info = $info } | Out-Null } catch {}
  exit 1
}
