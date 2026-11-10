(function(){
"use strict";
var WA="34699414559", MAIL="tnh@tierranuestrahuelva.es", URL_WEB="https://tierranuestrahuelva-lab.github.io/TNH/club/";
var MODS=[["Informativa","Solo recibe información"],["Mensual","Oferta del club cada mes"],["Bimestral","Oferta del club cada 2 meses"],["Trimestral","Oferta del club cada 3 meses"]];
var VINOS=["Tintos","Blancos","Rosados","Espumosos y cavas","Champagne","Generosos (Jerez · Condado)","Dulces"];
var INTER=["Catas y eventos","Novedades","Ofertas del club","Regalos de empresa"];
var CONOC=["En la tienda","Amigos / familia","Redes sociales","Web","Otros"];
var CANALES=["e-mail","WhatsApp","SMS / teléfono"];
var LEGAL=[
["Responsable","CONSTANTIN BECERRA S.L. (Tierra Nuestra Huelva) · NIF B21295688 · C/ Fernando el Católico, 34 · 21003 Huelva · Tel. 959 541 579 · tnh@tierranuestrahuelva.es."],
["Finalidad","Gestionar su inscripción y su condición de socio del Club de Vinos Tierra Nuestra Huelva: ventajas, pedidos, reservas y actividades del club (catas, presentaciones y eventos), enviarle la oferta del club con la periodicidad que elija y, solo si usted lo autoriza, otra información comercial sobre nuestros vinos, novedades y ofertas."],
["Legitimación","Su consentimiento (art. 6.1.a RGPD) y la gestión de la relación como socio del club (art. 6.1.b RGPD)."],
["Conservación","Mientras sea socio del club y, después, durante los plazos legalmente exigidos. Los datos para comunicaciones comerciales se conservarán hasta que retire su consentimiento."],
["Destinatarios","No se cederán sus datos a terceros, salvo obligación legal. Esta página no guarda sus datos: se envían directamente a Tierra Nuestra por WhatsApp o e-mail, desde su propio teléfono u ordenador."],
["Derechos","Puede ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad, así como retirar su consentimiento en cualquier momento, por escrito en nuestra tienda o en tnh@tierranuestrahuelva.es, adjuntando copia de su DNI. Si considera que sus derechos no han sido atendidos, puede presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es)."]];
var LEGAL_INTRO="En cumplimiento del Reglamento (UE) 2016/679 General de Protección de Datos (RGPD) y de la Ley Orgánica 3/2018 (LOPDGDD), le informamos de que sus datos personales serán tratados de la siguiente forma:";

var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var app=$("#app");
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function pad(n,l){n=String(n);while(n.length<(l||2))n="0"+n;return n}
function hoyISO(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function fmtD(iso){if(!iso)return "";var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso);return m?m[3]+"/"+m[2]+"/"+m[1]:iso}
function parseD(s){s=(s||"").trim();var m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);if(m)return m[3]+"-"+pad(m[2])+"-"+pad(m[1]);m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);return m?m[0]:""}
function edad(iso){if(!iso)return null;var b=new Date(iso+"T00:00:00"),n=new Date();var a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()==b.getMonth()&&n.getDate()<b.getDate()))a--;return a}
function normTel(t){var d=String(t||"").replace(/\D/g,"");if(d.length==9)d="34"+d;if(d.indexOf("0034")==0)d=d.slice(2);return d}

/* ---------- almacenamiento (solo en este dispositivo) ---------- */
var KEY="tnclub.socios.v1", KCFG="tnclub.cfg.v1";
function load(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(e){return []}}
function save(l){localStorage.setItem(KEY,JSON.stringify(l))}
function cfg(){var c;try{c=JSON.parse(localStorage.getItem(KCFG))||{}}catch(e){c={}}if(!c.prefijo&&c.prefijo!=="")c.prefijo="CLUB";if(!c.siguiente)c.siguiente=1;return c}
function saveCfg(c){localStorage.setItem(KCFG,JSON.stringify(c))}
function nuevoNum(){var c=cfg(),l=load(),n=c.siguiente,num;do{num=c.prefijo+pad(n,4);n++}while(l.some(function(s){return s.num===num}));c.siguiente=n;saveCfg(c);return num}

/* ---------- formulario ---------- */
function chips(name,list,sel){sel=sel||[];return '<div class="chips">'+list.map(function(v){return '<label class="chip"><input type="checkbox" name="'+name+'" value="'+esc(v)+'"'+(sel.indexOf(v)>=0?" checked":"")+'> '+esc(v)+'</label>'}).join("")+'</div>'}
function yn(name,val){return '<span class="yn"><label><input type="radio" name="'+name+'" value="si"'+(val===true?" checked":"")+'>SÍ</label><label><input type="radio" name="'+name+'" value="no"'+(val===false?" checked":"")+'>NO</label></span>'}
function legalHTML(){return '<p><i>'+LEGAL_INTRO+'</i></p>'+LEGAL.map(function(x){return '<p><b>'+x[0]+':</b> '+x[1]+'</p>'}).join("")}
function inp(id,label,type,val,cls,req,extra){return '<label class="fl '+cls+'"><span class="'+(req?"req":"")+'">'+label+'</span><input type="'+type+'" name="'+id+'" value="'+esc(val||"")+'" '+(extra||"")+'></label>'}

function formHTML(s,modoTienda){
  s=s||{prov:"Huelva"};
  var h='';
  if(modoTienda){
    h+='<section class="card"><h2>Ficha interna</h2><div class="grid">'+
      inp("num","Nº de socio","text",s.num||"(se asigna al guardar)","c2",false,s.num?"":"readonly")+
      inp("alta","Fecha de alta","date",s.alta||hoyISO(),"c2",true)+
      '<label class="fl c2"><span>Origen</span><select name="origen">'+["Tienda","Ficha en papel","WhatsApp","E-mail","Web"].map(function(o){return '<option'+(s.origen===o?" selected":"")+'>'+o+'</option>'}).join("")+'</select></label>'+
      '</div></section>';
  }
  h+='<section class="card"><h2>Datos del socio</h2><div class="grid">'+
    inp("nombre","Nombre","text",s.nombre,"c2",true,'autocomplete="given-name"')+
    inp("apellidos","Apellidos","text",s.apellidos,"c4",true,'autocomplete="family-name"')+
    inp("dni","DNI / NIE","text",s.dni,"c3",false,'autocomplete="off" style="text-transform:uppercase"')+
    inp("nac","Fecha de nacimiento","date",s.nac,"c3",true,'max="'+hoyISO()+'"')+
    inp("dir","Dirección","text",s.dir,"c6",false,'autocomplete="street-address"')+
    inp("cp","C.P.","text",s.cp,"c2",false,'inputmode="numeric" maxlength="5" autocomplete="postal-code"')+
    inp("loc","Localidad","text",s.loc,"c2",false,'autocomplete="address-level2"')+
    inp("prov","Provincia","text",s.prov,"c2 full",false,'autocomplete="address-level1"')+
    inp("movil","Teléfono móvil","tel",s.movil,"c2 full",true,'autocomplete="tel" inputmode="tel"')+
    inp("email","E-mail","email",s.email,"c4",false,'autocomplete="email"')+
    '</div></section>';
  h+='<section class="card"><h2>Modalidad del club</h2><div class="mods">'+MODS.map(function(m){return '<label class="mod"><input type="radio" name="modalidad" value="'+m[0]+'"'+(s.modalidad===m[0]?" checked":"")+'><b>'+m[0]+'</b><small>'+m[1]+'</small></label>'}).join("")+'</div>'+
    '<div class="sub">Vinos preferidos</div>'+chips("vinos",VINOS,s.vinos)+
    '<div class="sub">Me interesa</div>'+chips("intereses",INTER,s.intereses)+
    '<div class="sub">¿Cómo nos conoció?</div>'+chips("conocio",CONOC,s.conocio)+
    '<label class="fl" style="margin-top:16px"><span>Observaciones</span><textarea name="obs">'+esc(s.obs||"")+'</textarea></label></section>';
  h+='<section class="card"><h2>Protección de datos</h2><div class="legal">'+
    (modoTienda?'<details class="lg"><summary>Ver texto legal</summary>'+legalHTML()+'</details>':'<details class="lg"><summary>Información sobre protección de datos (léala antes de enviar)</summary>'+legalHTML()+'</details>')+
    '</div><div class="cons">'+
    '<div class="q">'+yn("comOK",s.comOK)+' Autorizo el envío de información sobre ofertas, novedades, catas y eventos del club por:<div class="canales">'+chips("canales",CANALES,s.canales||[])+'</div></div>'+
    '<div class="q">'+yn("imagen",s.imagen)+' Autorizo el uso de fotografías en las que pueda aparecer, tomadas en las actividades del club, para su publicación en la web y redes sociales de Tierra Nuestra.</div>'+
    '<label class="ck"><input type="checkbox" name="mayor"'+(s.mayor?" checked":"")+'> <span>Declaro ser <b>mayor de 18 años</b> y que los datos facilitados son ciertos. *</span></label>'+
    '<label class="ck"><input type="checkbox" name="acepta"'+(s.acepta?" checked":"")+'> <span>He leído y acepto la información sobre protección de datos. *</span></label>'+
    '</div></section>';
  return h;
}
function readForm(root){
  var f=function(n){var e=$('[name="'+n+'"]',root);return e?e.value.trim():""};
  var arr=function(n){return $$('[name="'+n+'"]:checked',root).map(function(e){return e.value})};
  var rad=function(n){var e=$('[name="'+n+'"]:checked',root);return e?e.value:""};
  var ynv=function(n){var v=rad(n);return v==="si"?true:v==="no"?false:null};
  var s={nombre:f("nombre"),apellidos:f("apellidos"),dni:f("dni").toUpperCase().replace(/\s|-/g,""),nac:f("nac"),dir:f("dir"),cp:f("cp"),loc:f("loc"),prov:f("prov"),movil:f("movil"),email:f("email").toLowerCase(),
    modalidad:rad("modalidad"),vinos:arr("vinos"),intereses:arr("intereses"),conocio:arr("conocio"),obs:f("obs"),
    comOK:ynv("comOK"),canales:arr("canales"),imagen:ynv("imagen"),mayor:!!($('[name="mayor"]',root)||{}).checked,acepta:!!($('[name="acepta"]',root)||{}).checked};
  if($('[name="alta"]',root)){s.alta=f("alta");s.origen=f("origen")}
  if(s.comOK!==true)s.canales=[];
  return s;
}
function validar(s){
  var e=[];
  if(!s.nombre)e.push("Falta el nombre.");
  if(!s.apellidos)e.push("Faltan los apellidos.");
  if(!s.movil||normTel(s.movil).length<11)e.push("Falta el teléfono móvil (9 cifras).");
  if(s.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email))e.push("El e-mail no parece correcto.");
  if(!s.nac)e.push("Falta la fecha de nacimiento.");else if(edad(s.nac)<18)e.push("Para ser socio hay que ser mayor de 18 años.");
  if(!s.modalidad)e.push("Elija la modalidad del club.");
  if(s.comOK===null)e.push("Marque SÍ o NO en el envío de información.");
  if(s.comOK===true&&!s.canales.length)e.push("Elija al menos un canal (e-mail, WhatsApp o SMS).");
  if(s.comOK===true&&s.canales.indexOf("e-mail")>=0&&!s.email)e.push("Ha elegido recibir información por e-mail: indique su e-mail.");
  if(s.imagen===null)e.push("Marque SÍ o NO en el uso de fotografías.");
  if(!s.mayor)e.push("Debe declarar que es mayor de 18 años.");
  if(!s.acepta)e.push("Debe aceptar la información sobre protección de datos.");
  return e;
}

/* ---------- mensaje (WhatsApp / e-mail) y lectura del mensaje ---------- */
var CAMPOS=[["Nombre","nombre"],["Apellidos","apellidos"],["DNI/NIE","dni"],["Fecha de nacimiento","nac","d"],["Dirección","dir"],["C.P.","cp"],["Localidad","loc"],["Provincia","prov"],["Móvil","movil"],["E-mail","email"],["Modalidad del club","modalidad"],["Vinos preferidos","vinos","a"],["Me interesa","intereses","a"],["Nos conoció","conocio","a"],["Observaciones","obs"]];
function sino(b){return b?"SÍ":"NO"}
function mensaje(s){
  var l=["*ALTA CLUB DE VINOS TIERRA NUESTRA*",""];
  CAMPOS.forEach(function(c){var v=s[c[1]];if(c[2]==="a")v=(v||[]).join(", ");if(c[2]==="d")v=fmtD(v);l.push(c[0]+": "+(v||"-"))});
  l.push("Comunicaciones comerciales: "+sino(s.comOK)+(s.comOK?" ("+s.canales.join(", ")+")":""));
  l.push("Uso de imagen: "+sino(s.imagen));
  l.push("Mayor de 18 años: "+sino(s.mayor));
  l.push("Acepta protección de datos: "+sino(s.acepta));
  var d=new Date();l.push("Fecha de solicitud: "+pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear());
  return l.join("\n");
}
function leerMensaje(txt){
  var map={};txt.split(/\r?\n/).forEach(function(line){var m=/^\s*\*?([^:*]+?)\*?\s*:\s*(.*)$/.exec(line);if(m)map[m[1].trim().toLowerCase()]=m[2].trim()});
  var g=function(k){var v=map[k.toLowerCase()];return v&&v!=="-"?v:""};
  if(!g("Nombre")&&!g("Apellidos"))return null;
  var s={};
  CAMPOS.forEach(function(c){var v=g(c[0]);if(c[2]==="a")v=v?v.split(/\s*,\s*/).filter(Boolean):[];if(c[2]==="d")v=parseD(v);s[c[1]]=v});
  var mods=MODS.map(function(m){return m[0]});s.modalidad=mods.filter(function(m){return m.toLowerCase()===String(s.modalidad).toLowerCase()})[0]||"";
  var com=g("Comunicaciones comerciales");s.comOK=/^s[ií]/i.test(com);var cm=/\((.*)\)/.exec(com);s.canales=s.comOK&&cm?cm[1].split(/\s*,\s*/):[];
  s.imagen=/^s[ií]/i.test(g("Uso de imagen"));s.mayor=/^s[ií]/i.test(g("Mayor de 18 años"));s.acepta=/^s[ií]/i.test(g("Acepta protección de datos"));
  var fs=parseD(g("Fecha de solicitud"));s.alta=fs||hoyISO();
  return s;
}

/* ---------- página pública ---------- */
function vistaPublica(){
  document.title="Club de Vinos · Tierra Nuestra Huelva";$("#pageTitle").textContent="Hazte socio";
  app.innerHTML='<section class="card"><p class="lead">Únase al <b>Club de Vinos Tierra Nuestra Huelva</b>: elija cómo quiere recibir la oferta del club y le daremos de alta.</p><p class="note" style="margin:4px 0 0">Los campos con * son obligatorios. Al final, pulse <b>Enviar por WhatsApp</b> o <b>Enviar por e-mail</b>.</p></section>'+
   '<form id="f" novalidate>'+formHTML(null,false)+
   '<section class="card"><div class="btns"><button type="submit" class="btn wa" data-via="wa">Enviar por WhatsApp</button><button type="submit" class="btn sec" data-via="mail">Enviar por e-mail</button></div><div class="err" id="err"></div>'+
   '<p class="note">Se abrirá WhatsApp o su correo con la solicitud ya escrita: solo tiene que pulsar enviar. Esta página no guarda ningún dato.</p></section></form>';
  var via="wa";
  $$("#f [data-via]").forEach(function(b){b.addEventListener("click",function(){via=b.getAttribute("data-via")})});
  $("#f").addEventListener("submit",function(ev){
    ev.preventDefault();var s=readForm($("#f")),e=validar(s);
    if(e.length){$("#err").textContent=e.join("\n");$("#err").scrollIntoView({behavior:"smooth",block:"center"});return}
    $("#err").textContent="";var msg=mensaje(s);
    var link=via==="wa"?"https://wa.me/"+WA+"?text="+encodeURIComponent(msg):"mailto:"+MAIL+"?subject="+encodeURIComponent("Alta Club de Vinos - "+s.nombre+" "+s.apellidos)+"&body="+encodeURIComponent(msg.replace(/\*/g,""));
    var w=null;if(via==="wa"){try{w=window.open(link,"_blank")}catch(x){}}if(!w)window.location.href=link;
    (function(){
      app.innerHTML='<section class="card ok"><p class="big">¡Gracias, '+esc(s.nombre)+'!</p><p>Si se ha abierto '+(via==="wa"?"WhatsApp":"su correo")+', pulse <b>enviar</b> para completar la solicitud.<br>Le confirmaremos el alta en el club muy pronto.</p><div class="btns" style="justify-content:center;margin-top:16px"><a class="btn '+(via==="wa"?"wa":"")+'" href="'+esc(link)+'">Abrir de nuevo '+(via==="wa"?"WhatsApp":"el correo")+'</a><a class="btn sec" href="#" id="otra">Volver</a></div></section>';
      $("#otra").addEventListener("click",function(e){e.preventDefault();vistaPublica();window.scrollTo(0,0)});
      window.scrollTo(0,0);
    })();
  });
}

/* ---------- tienda ---------- */
var tab="socios", editId=null;
function vistaTienda(){
  document.title="Club de Vinos · Panel tienda";$("#pageTitle").textContent="Panel de la tienda";
  var T=[["socios","Socios"],["alta","Nueva alta"],["pegar","Pegar WhatsApp / e-mail"],["envios","Envíos del mes"],["sage","Pasar a Sage"],["ajustes","Ajustes y copia"]];
  var l=load();
  app.innerHTML='<div class="warn noprint">Los socios se guardan <b>en este dispositivo</b> (ordenador o tablet de la tienda). Haga una copia de seguridad en <b>Ajustes y copia</b> de vez en cuando.</div>'+
    '<div class="tabs">'+T.map(function(t){return '<button class="tab'+(tab===t[0]?" on":"")+'" data-t="'+t[0]+'">'+t[1]+(t[0]==="socios"?" ("+l.length+")":"")+'</button>'}).join("")+'</div><div id="tv"></div>';
  $$(".tab").forEach(function(b){b.addEventListener("click",function(){tab=b.getAttribute("data-t");if(tab!=="alta")editId=null;vistaTienda();window.scrollTo(0,0)})});
  ({socios:tSocios,alta:tAlta,pegar:tPegar,envios:tEnvios,sage:tSage,ajustes:tAjustes})[tab]($("#tv"));
}
function ir(t,id){tab=t;editId=id||null;vistaTienda();window.scrollTo(0,0)}
function stats(l){var c={};MODS.forEach(function(m){c[m[0]]=0});l.forEach(function(s){if(c[s.modalidad]!=null)c[s.modalidad]++});
  return '<div class="stats"><div class="stat"><b>'+l.length+'</b><span>Socios</span></div>'+MODS.map(function(m){return '<div class="stat"><b>'+c[m[0]]+'</b><span>'+m[0]+'</span></div>'}).join("")+'</div>'}
function tSocios(v){
  var l=load();
  v.innerHTML=stats(l)+'<section class="card"><div class="row" style="margin-bottom:10px"><input type="search" id="q" placeholder="Buscar por nombre, móvil, DNI, e-mail…"><select id="fm"><option value="">Todas las modalidades</option>'+MODS.map(function(m){return '<option>'+m[0]+'</option>'}).join("")+'</select></div><div id="lst"></div></section>';
  function pinta(){
    var q=$("#q").value.toLowerCase().trim(),fm=$("#fm").value;
    var r=l.filter(function(s){return(!fm||s.modalidad===fm)&&(!q||[s.num,s.nombre,s.apellidos,s.movil,s.dni,s.email,s.loc].join(" ").toLowerCase().indexOf(q)>=0)}).sort(function(a,b){return String(b.num).localeCompare(String(a.num))});
    $("#lst").innerHTML=r.length?'<table class="list"><tr><th>Nº</th><th>Socio</th><th class="hm">Contacto</th><th>Modalidad</th><th class="hm">Alta</th><th>Sage</th></tr>'+r.map(function(s){
      return '<tr data-id="'+s.id+'" style="cursor:pointer"><td>'+esc(s.num)+'</td><td><b>'+esc(s.apellidos)+'</b>, '+esc(s.nombre)+'<br><small>'+esc(s.loc||"")+'</small></td><td class="hm">'+esc(s.movil)+'<br><small>'+esc(s.email||"")+'</small></td><td><span class="pill">'+esc(s.modalidad)+'</span></td><td class="hm">'+fmtD(s.alta)+'</td><td>'+(s.sage?'<span class="pill sage">Pasado</span>':'<span class="pill no">Pendiente</span>')+'</td></tr>'}).join("")+'</table>':'<p class="note">'+(l.length?"No hay socios con ese filtro.":"Todavía no hay socios. Use <b>Nueva alta</b> o <b>Pegar WhatsApp / e-mail</b>.")+'</p>';
    $$("#lst tr[data-id]").forEach(function(tr){tr.addEventListener("click",function(){ir("alta",tr.getAttribute("data-id"))})});
  }
  $("#q").addEventListener("input",pinta);$("#fm").addEventListener("change",pinta);pinta();
}
function tAlta(v,pre){
  var l=load(),s=editId?l.filter(function(x){return x.id===editId})[0]:(pre||null);
  v.innerHTML='<form id="f" novalidate>'+formHTML(s||{prov:"Huelva",origen:"Tienda"},true)+'<section class="card"><div class="btns"><button class="btn" type="submit">'+(editId?"Guardar cambios":"Dar de alta")+'</button>'+(editId?'<button class="btn sec" type="button" id="imp">Imprimir ficha</button><button class="btn danger" type="button" id="del">Dar de baja (borrar)</button>':'')+'</div><div class="err" id="err"></div></section></form>';
  $("#f").addEventListener("submit",function(ev){
    ev.preventDefault();var n=readForm($("#f")),e=validar(n);
    if(!n.alta)e.push("Falta la fecha de alta.");
    var dup=l.filter(function(x){return x.id!==editId&&((n.dni&&x.dni===n.dni)||normTel(x.movil)===normTel(n.movil))})[0];
    if(dup&&!confirm("Ya existe un socio con ese DNI o móvil: "+dup.num+" "+dup.nombre+" "+dup.apellidos+".\n¿Guardar de todos modos?"))return;
    if(e.length){$("#err").textContent=e.join("\n");return}
    if(editId){l=l.map(function(x){return x.id===editId?Object.assign({},x,n,{mod:Date.now()}):x})}
    else{n.id="s"+Date.now()+Math.random().toString(36).slice(2,6);n.num=nuevoNum();n.sage=false;n.creado=Date.now();l.push(n)}
    save(l);alert(editId?"Cambios guardados.":"Socio dado de alta con el nº "+n.num+".");ir("socios");
  });
  if(editId){
    $("#del").addEventListener("click",function(){if(confirm("¿Borrar a "+s.nombre+" "+s.apellidos+" del club? (Si ya está en Sage, recuerde darlo de baja también allí.)")){save(l.filter(function(x){return x.id!==editId}));ir("socios")}});
    $("#imp").addEventListener("click",function(){window.print()});
  }
}
function tPegar(v){
  v.innerHTML='<section class="card"><h2>Pegar solicitud recibida</h2><p class="note" style="margin-top:0">Copie el mensaje que ha llegado por WhatsApp o e-mail (desde "ALTA CLUB DE VINOS…" hasta la fecha) y péguelo aquí.</p><textarea id="t" style="min-height:220px" placeholder="*ALTA CLUB DE VINOS TIERRA NUESTRA*&#10;Nombre: …"></textarea><div class="btns" style="margin-top:10px"><button class="btn" id="go">Leer mensaje</button></div><div class="err" id="err"></div></section><div id="res"></div>';
  $("#go").addEventListener("click",function(){
    var s=leerMensaje($("#t").value);
    if(!s){$("#err").textContent="No he encontrado los datos. Asegúrese de pegar el mensaje completo.";return}
    $("#err").textContent="";s.origen=/\*ALTA CLUB/.test($("#t").value)?"WhatsApp":"E-mail";
    editId=null;var r=$("#res");r.innerHTML='<div class="warn">Revise los datos y pulse <b>Dar de alta</b> al final.</div><div id="ra"></div>';tAlta($("#ra"),s);r.scrollIntoView({behavior:"smooth"});
  });
}
function mesesEntre(alta,ym){var a=/^(\d{4})-(\d{2})/.exec(alta||"");if(!a)return 0;var b=ym.split("-");return(+b[0]*12+(+b[1]))-(+a[1]*12+(+a[2]))}
function tocaEnvio(s,ym){var d=mesesEntre(s.alta,ym);if(d<0)return false;if(s.modalidad==="Mensual")return true;if(s.modalidad==="Bimestral")return d%2===0;if(s.modalidad==="Trimestral")return d%3===0;return false}
function tEnvios(v){
  var d=new Date(),ym=d.getFullYear()+"-"+pad(d.getMonth()+1);
  v.innerHTML='<section class="card"><h2>¿A quién mandar la oferta del club?</h2><div class="row"><label class="fl"><span>Mes</span><input type="month" id="m" value="'+ym+'" style="margin-top:4px;padding:9px;border:1px solid #cfc5ca;border-radius:7px;font:inherit"></label><label class="ck" style="margin-bottom:10px"><input type="checkbox" id="inf"> <span>Incluir también a los socios <b>Informativa</b> (para mandar una información general)</span></label></div><p class="note">Mensual: todos los meses · Bimestral: cada 2 meses · Trimestral: cada 3 meses, contando desde el mes de alta. Solo aparecen los socios que dijeron <b>SÍ</b> a recibir información.</p><div id="lst"></div></section>';
  function pinta(){
    var m=$("#m").value,inf=$("#inf").checked,l=load();
    var r=l.filter(function(s){return s.comOK&&(tocaEnvio(s,m)||(inf&&s.modalidad==="Informativa"))}).sort(function(a,b){return a.apellidos.localeCompare(b.apellidos)});
    var mails=r.filter(function(s){return s.email&&s.canales.indexOf("e-mail")>=0}).map(function(s){return s.email});
    $("#lst").innerHTML='<div class="btns" style="margin:6px 0 12px"><button class="btn sm sec" id="cpm"'+(mails.length?"":" disabled")+'>Copiar e-mails ('+mails.length+')</button><button class="btn sm sec" id="xl"'+(r.length?"":" disabled")+'>Descargar lista en Excel</button></div>'+
     (r.length?'<table class="list"><tr><th>Socio</th><th>Modalidad</th><th class="hm">Canales</th><th>Enviar</th></tr>'+r.map(function(s){
      var wa=s.canales.indexOf("WhatsApp")>=0?'<a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/'+normTel(s.movil)+'?text='+encodeURIComponent("Hola "+s.nombre+", ")+'">WhatsApp</a> ':'';
      var em=s.email&&s.canales.indexOf("e-mail")>=0?'<a class="btn sm sec" href="mailto:'+esc(s.email)+'">E-mail</a>':'';
      return '<tr><td><b>'+esc(s.apellidos)+'</b>, '+esc(s.nombre)+'<br><small>'+esc(s.movil)+'</small></td><td><span class="pill">'+esc(s.modalidad)+'</span></td><td class="hm">'+esc(s.canales.join(", "))+'</td><td>'+wa+em+'</td></tr>'}).join("")+'</table>':'<p class="note">Este mes no toca enviar la oferta a nadie.</p>');
    var c=$("#cpm");c&&c.addEventListener("click",function(){var t=mails.join("; ");(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){alert("E-mails copiados. Péguelos en el campo CCO (copia oculta) de su correo.")},function(){prompt("Copie los e-mails (péguelos en CCO):",t)})});
    var x=$("#xl");x&&x.addEventListener("click",function(){
      var rows=r.map(function(s){return{"Nº socio":s.num,"Nombre":s.nombre,"Apellidos":s.apellidos,"Modalidad":s.modalidad,"Móvil":s.movil,"E-mail":s.email,"Canales":s.canales.join(", "),"Vinos preferidos":(s.vinos||[]).join(", ")}});
      var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Envíos "+m);XLSX.writeFile(wb,"Envios club "+m+".xlsx")});
  }
  $("#m").addEventListener("change",pinta);$("#inf").addEventListener("change",pinta);pinta();
}
function filaSage(s){
  var obs=["Club de Vinos: "+s.modalidad,"Nº socio "+s.num];
  if(s.vinos&&s.vinos.length)obs.push("Prefiere: "+s.vinos.join(", "));
  obs.push("Comunicaciones: "+(s.comOK?"SÍ ("+s.canales.join(", ")+")":"NO"));
  obs.push("Imagen: "+sino(s.imagen));
  if(s.obs)obs.push(s.obs);
  return{"Código":s.num,"Nombre":(s.apellidos+", "+s.nombre).toUpperCase(),"NIF":s.dni,"Domicilio":s.dir,"Código postal":s.cp,"Población":s.loc,"Provincia":s.prov,"País":"España","Teléfono":s.movil,"E-mail":s.email,"Fecha de alta":fmtD(s.alta),"Fecha de nacimiento":fmtD(s.nac),"Observaciones":obs.join(" · ")};
}
function filaClub(s){return{"Nº socio":s.num,"Fecha alta":fmtD(s.alta),"Origen":s.origen||"","Nombre":s.nombre,"Apellidos":s.apellidos,"DNI/NIE":s.dni,"Fecha nacimiento":fmtD(s.nac),"Dirección":s.dir,"C.P.":s.cp,"Localidad":s.loc,"Provincia":s.prov,"Móvil":s.movil,"E-mail":s.email,"Modalidad":s.modalidad,"Vinos preferidos":(s.vinos||[]).join(", "),"Me interesa":(s.intereses||[]).join(", "),"Nos conoció":(s.conocio||[]).join(", "),"Comunicaciones":sino(s.comOK),"Canales":(s.canales||[]).join(", "),"Uso de imagen":sino(s.imagen),"Mayor de 18":sino(s.mayor),"Acepta RGPD":sino(s.acepta),"Observaciones":s.obs,"Pasado a Sage":s.sage?"SÍ "+(s.sageFecha?fmtD(s.sageFecha):""):"NO"}}
function tSage(v){
  var l=load(),pend=l.filter(function(s){return!s.sage});
  v.innerHTML='<section class="card"><h2>Pasar los socios a Sage 50</h2>'+
   '<p>Pendientes de pasar: <b>'+pend.length+'</b> de '+l.length+' socios.</p>'+
   '<label class="ck"><input type="checkbox" id="solo" checked> <span>Solo los pendientes (los que aún no están en Sage)</span></label>'+
   '<div class="btns" style="margin-top:10px"><button class="btn" id="x">Descargar Excel para Sage</button><button class="btn sec" id="csv">Descargar CSV</button></div>'+
   '<p class="note">El Excel trae la hoja <b>Clientes Sage</b> (una fila por socio con Código = nº de socio, Nombre, NIF, Domicilio, C.P., Población, Provincia, Teléfono, E-mail y en Observaciones la modalidad del club y sus preferencias) y la hoja <b>Club completo</b> con todos los datos. En Sage 50, impórtelo como clientes; la primera vez habrá que indicar qué columna va a cada campo.</p>'+
   '<div class="btns" style="margin-top:12px"><button class="btn k" id="mk"'+(pend.length?"":" disabled")+'>Marcar los pendientes como pasados a Sage</button></div></section>';
  function datos(){return $("#solo").checked?pend:l}
  $("#x").addEventListener("click",function(){var d=datos();if(!d.length){alert("No hay socios para exportar.");return}
    var wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(d.map(filaSage));ws["!cols"]=[10,30,12,30,8,16,12,8,12,26,12,12,60].map(function(w){return{wch:w}});
    XLSX.utils.book_append_sheet(wb,ws,"Clientes Sage");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(d.map(filaClub)),"Club completo");XLSX.writeFile(wb,"Club de Vinos para Sage "+hoyISO()+".xlsx");
    if(pend.length&&$("#solo").checked&&confirm("¿Ya los ha pasado a Sage? Pulse Aceptar para marcarlos como pasados (no saldrán la próxima vez)."))marcar();});
  $("#csv").addEventListener("click",function(){var d=datos();if(!d.length){alert("No hay socios para exportar.");return}
    var ws=XLSX.utils.json_to_sheet(d.map(filaSage)),csv=XLSX.utils.sheet_to_csv(ws,{FS:";"});var b=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="Club de Vinos para Sage "+hoyISO()+".csv";a.click()});
  function marcar(){var h=hoyISO();save(load().map(function(s){if(!s.sage){s.sage=true;s.sageFecha=h}return s}));vistaTienda()}
  $("#mk").addEventListener("click",function(){if(confirm("¿Marcar "+pend.length+" socios como ya pasados a Sage?"))marcar()});
}
function tAjustes(v){
  var c=cfg();
  v.innerHTML='<section class="card"><h2>Número de socio</h2><div class="row"><label class="fl"><span>Prefijo</span><input type="text" id="pf" value="'+esc(c.prefijo)+'"></label><label class="fl"><span>Siguiente número</span><input type="text" id="sg" inputmode="numeric" value="'+c.siguiente+'"></label></div><p class="note">Ejemplo del próximo: <b id="ej"></b>. Si en Sage los clientes usan otro tipo de código, cámbielo aquí.</p><div class="btns"><button class="btn sm" id="gc">Guardar</button></div></section>'+
   '<section class="card"><h2>Copia de seguridad</h2><p class="note" style="margin-top:0">Guarde una copia y pásela a otro ordenador o tablet con <b>Recuperar copia</b>.</p><div class="btns"><button class="btn sm" id="bk">Descargar copia</button><label class="btn sm sec" style="cursor:pointer">Recuperar copia<input type="file" id="rs" accept=".json" hidden></label><button class="btn sm sec" id="xa">Excel con todos los socios</button></div></section>'+
   '<section class="card"><h2>Enlace para los clientes</h2><div class="qr"><img src="assets/qr.svg" alt="QR"><div><p style="margin-top:0">Comparta este enlace (o el código QR) para que se inscriban desde su móvil:</p><p><a href="'+URL_WEB+'" target="_blank" rel="noopener"><b>'+URL_WEB+'</b></a></p><div class="btns"><button class="btn sm sec" id="cpl">Copiar enlace</button><a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent("Hazte socio del Club de Vinos Tierra Nuestra Huelva: "+URL_WEB)+'">Compartir por WhatsApp</a></div></div></div></section>';
  function ej(){$("#ej").textContent=$("#pf").value+pad(parseInt($("#sg").value,10)||1,4)}ej();
  $("#pf").addEventListener("input",ej);$("#sg").addEventListener("input",ej);
  $("#gc").addEventListener("click",function(){c.prefijo=$("#pf").value.trim();c.siguiente=parseInt($("#sg").value,10)||1;saveCfg(c);alert("Guardado.")});
  $("#bk").addEventListener("click",function(){var b=new Blob([JSON.stringify({app:"tnclub",fecha:new Date().toISOString(),cfg:cfg(),socios:load()},null,1)],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="Copia Club de Vinos "+hoyISO()+".json";a.click()});
  $("#rs").addEventListener("change",function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var d=JSON.parse(r.result);if(d.app!=="tnclub"||!Array.isArray(d.socios))throw 0;var l=load(),ids={};l.forEach(function(s){ids[s.id]=1});var nuevos=d.socios.filter(function(s){return!ids[s.id]});if(!confirm("La copia tiene "+d.socios.length+" socios ("+nuevos.length+" nuevos para este dispositivo). ¿Añadirlos?"))return;save(l.concat(nuevos));var c2=cfg();if(d.cfg&&d.cfg.siguiente>c2.siguiente){c2.siguiente=d.cfg.siguiente;c2.prefijo=d.cfg.prefijo;saveCfg(c2)}alert("Copia recuperada.");ir("socios")}catch(x){alert("Ese archivo no es una copia del Club de Vinos.")}};r.readAsText(f)});
  $("#xa").addEventListener("click",function(){var l=load();if(!l.length){alert("No hay socios.");return}var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(l.map(filaClub)),"Socios");XLSX.writeFile(wb,"Socios Club de Vinos "+hoyISO()+".xlsx")});
  $("#cpl").addEventListener("click",function(){(navigator.clipboard?navigator.clipboard.writeText(URL_WEB):Promise.reject()).then(function(){alert("Enlace copiado.")},function(){prompt("Copie el enlace:",URL_WEB)})});
}

function route(){if(location.hash==="#tienda")vistaTienda();else vistaPublica()}
window.addEventListener("hashchange",function(){route();window.scrollTo(0,0)});
window.TNCLUB={mensaje:mensaje,leerMensaje:leerMensaje,tocaEnvio:tocaEnvio,validar:validar};
route();
})();
