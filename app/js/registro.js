/* Página de registro de técnicos con subida de fotos. */
(function () {
  const { store, OFICIOS, BARRIOS } = window.OS;
  const { $, $$, esc, normTel, header, toast } = window.UI;
  header("reg");

  const MAX = 6;
  let files = [];

  $("#rOficio").innerHTML = Object.entries(OFICIOS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
  $("#rBarrios").innerHTML = BARRIOS.map((b, i) => `<label><input type="checkbox" id="rb${i}" value="${esc(b)}"> ${esc(b)}</label>`).join("");

  function renderPreviews() {
    $("#previews").innerHTML = files.map((f, i) => `<figure><img src="${URL.createObjectURL(f)}" alt="Foto ${i + 1}"><button type="button" data-del="${i}" aria-label="Quitar foto ${i + 1}">×</button></figure>`).join("");
  }
  $("#rFotos").addEventListener("change", e => {
    const nuevos = [...e.target.files].filter(f => f.type.startsWith("image/"));
    if (files.length + nuevos.length > MAX) toast(`Puedes subir hasta ${MAX} fotos. Se tomaron las primeras.`, true);
    files = [...files, ...nuevos].slice(0, MAX);
    e.target.value = "";
    renderPreviews();
  });
  $("#previews").addEventListener("click", e => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    files.splice(+b.dataset.del, 1); renderPreviews();
  });

  $("#regForm").addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = $("#rNombre").value.trim();
    const whatsapp = normTel($("#rTel").value);
    const anios = parseInt($("#rAnios").value, 10);
    const tarifa = parseInt($("#rTarifa").value, 10);
    const barrios = $$("#rBarrios input:checked").map(x => x.value);
    const err = [];
    if (nombre.length < 5) err.push("tu nombre completo");
    if (!whatsapp) err.push("un celular de 10 dígitos que empiece por 3");
    if (!barrios.length) err.push("al menos un barrio");
    if (!$("#rConsent").checked) err.push("aceptar la autorización de datos");
    if (err.length) { $("#rErr").textContent = "Falta " + err.join(", ") + "."; $("#rErr").hidden = false; return; }
    $("#rErr").hidden = true;

    const btn = $("#rBtn"); btn.disabled = true; btn.textContent = files.length ? "Subiendo fotos…" : "Enviando…";
    try {
      await store.crearTecnico({
        nombre, whatsapp, oficio: $("#rOficio").value,
        anios: Number.isFinite(anios) ? Math.max(0, Math.min(60, anios)) : 0,
        tarifa: Number.isFinite(tarifa) ? Math.max(0, tarifa) : 0,
        descripcion: $("#rDesc").value.trim(), barrios, consentimiento: true,
      }, files);
      $("#regForm").hidden = true; $("#rOk").hidden = false; window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (ex) {
      $("#rErr").textContent = "No se pudo enviar tu perfil: " + ex.message; $("#rErr").hidden = false;
    } finally { btn.disabled = false; btn.textContent = "Enviar mi perfil"; }
  });
  $("#rOtro").addEventListener("click", () => {
    $("#regForm").reset(); files = []; renderPreviews(); $("#regForm").hidden = false; $("#rOk").hidden = true;
  });
})();
