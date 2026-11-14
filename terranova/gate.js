window.TN_PUBLICO = true;
(function () {
  const KEY = "terranova-clave";
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function abrir(clave, datos) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveKey"]);
    const k = await crypto.subtle.deriveKey({name: "PBKDF2", salt: b64(datos.salt), iterations: datos.iter, hash: "SHA-256"},
      base, {name: "AES-GCM", length: 256}, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({name: "AES-GCM", iv: b64(datos.iv)}, k, b64(datos.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  async function intentar(clave, recordar) {
    const datos = await (await fetch("datos.json", {cache: "no-store"})).json();
    const d = await abrir(clave.trim().toLowerCase(), datos);
    if (recordar) localStorage.setItem(KEY, clave.trim().toLowerCase());
    render(d);
    const f = new Date(d._generado).toLocaleString("es-ES", {day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"});
    document.getElementById("sync").innerHTML = `<span class="dot ok"></span>Datos de Sage 50 del ${f}`;
    document.getElementById("gate").remove();
  }
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("gate-form"), msg = document.getElementById("gate-msg");
    const guardada = localStorage.getItem(KEY);
    if (guardada) intentar(guardada, false).catch(() => localStorage.removeItem(KEY));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      msg.textContent = "Abriendo…";
      try { await intentar(form.clave.value, form.recordar.checked); }
      catch { msg.textContent = "Contraseña incorrecta. Revísala e inténtalo otra vez."; }
    });
  });
})();
