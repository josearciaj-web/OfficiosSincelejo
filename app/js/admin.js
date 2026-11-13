/* Panel de administración: aprobar técnicos, verificar, moderar reseñas y ver métricas del MVP. */
(function () {
  const { store, OFICIOS } = window.OS;
  const { $, $$, esc, cop, avg, dec, fecha, thumbs, header, toast } = window.UI;
  header("adm");

  let tab = "pend", TEC = [], RES = [], CON = [];

  if (store.mode === "demo") {
    $("#loginHint").innerHTML = `Modo demostración: escribe cualquier correo y la contraseña <b>${esc(window.OS.CFG.DEMO_ADMIN_PASSWORD || "admin123")}</b>.`;
  }

  async function boot() {
    const s = await store.session();
    $("#login").hidden = !!s; $("#panelAdm").hidden = !s;
    if (s) { $("#who").textContent = s.email; await reload(); }
  }
  async function reload() {
    try {
      [TEC, RES, CON] = await Promise.all([store.adminTecnicos(), store.adminResenas(), store.adminContactos()]);
    } catch (e) { $("#view").innerHTML = `<div class="empty">No se pudieron cargar los datos: ${esc(e.message)}</div>`; return; }
    $("#bPend").textContent = TEC.filter(t => t.estado === "pendiente").length;
    render();
  }

  const resOf = id => RES.filter(r => r.tecnico_id === id && r.estado === "publicada");
  function tecRow(t, actions) {
    return `<div class="arow">
      <div class="mini">${thumbs(t, 4)}</div>
      <div style="display:grid;gap:4px;min-width:0">
        <div class="row" style="gap:8px"><b style="font-size:17px">${esc(t.nombre)}</b><span class="state ${esc(t.estado)}">${esc(t.estado)}</span>${t.verificado ? '<span class="verif">✓ Cédula verificada</span>' : ""}</div>
        <div class="meta">${esc(OFICIOS[t.oficio] || t.oficio)} · ${t.anios || 0} años · Visita ${cop(t.tarifa)} · WhatsApp +${esc(String(t.whatsapp).replace(/\D/g, ""))}</div>
        <div class="meta">Barrios: ${(t.barrios || []).map(esc).join(", ") || "—"}</div>
        ${t.descripcion ? `<div style="overflow-wrap:anywhere">${esc(t.descripcion)}</div>` : ""}
        <div class="meta">Registrado el ${fecha(t.created_at)} · ${(t.fotos || []).length} fotos · ${resOf(t.id).length} reseñas · ${CON.filter(c => c.tecnico_id === t.id).length} contactos</div>
      </div>
      <div class="acts">${actions}</div>
    </div>`;
  }

  function render() {
    $$(".tab").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
    const v = $("#view");
    if (tab === "pend") {
      const p = TEC.filter(t => t.estado === "pendiente");
      v.innerHTML = p.length ? `<p class="note" style="margin-bottom:12px">Antes de aprobar, verifica la cédula del técnico (en persona o por videollamada) y confirma que las fotos son de sus trabajos.</p><div class="admin-list">${p.map(t => tecRow(t,
        `<button class="btn btn-pri sm" data-act="aprobarv" data-id="${esc(t.id)}">Aprobar y verificar</button>
         <button class="btn btn-ghost sm" data-act="aprobar" data-id="${esc(t.id)}">Aprobar sin verificar</button>
         <button class="btn btn-bad sm" data-act="rechazar" data-id="${esc(t.id)}">Rechazar</button>`)).join("")}</div>`
        : `<div class="empty">No hay perfiles por revisar.</div>`;
    }
    if (tab === "tec") {
      const p = TEC.filter(t => t.estado !== "pendiente");
      v.innerHTML = p.length ? `<div class="admin-list">${p.map(t => tecRow(t,
        (t.estado === "aprobado"
          ? `<button class="btn btn-ghost sm" data-act="verif" data-id="${esc(t.id)}">${t.verificado ? "Quitar verificación" : "Marcar verificado"}</button>
             <button class="btn btn-bad sm" data-act="retirar" data-id="${esc(t.id)}">Retirar del directorio</button>`
          : `<button class="btn btn-ghost sm" data-act="aprobar" data-id="${esc(t.id)}">Publicar</button>`)
        + `<button class="btn btn-bad sm" data-act="borrar" data-id="${esc(t.id)}">Eliminar</button>`)).join("")}</div>`
        : `<div class="empty">Todavía no hay técnicos aprobados.</div>`;
    }
    if (tab === "res") {
      v.innerHTML = RES.length ? `<div class="tblwrap"><table><thead><tr><th>Fecha</th><th>Técnico</th><th>Autor</th><th>Estrellas</th><th>Comentario</th><th>Estado</th><th></th></tr></thead><tbody>
        ${RES.map(r => `<tr><td>${fecha(r.created_at)}</td><td>${esc((r.tecnicos || {}).nombre || "—")}</td><td>${esc(r.autor)}</td><td class="stars">${"★".repeat(r.estrellas)}</td><td style="min-width:220px;overflow-wrap:anywhere">${esc(r.texto || "")}</td><td><span class="state ${esc(r.estado)}">${esc(r.estado)}</span></td>
        <td><button class="btn btn-ghost sm" data-act="${r.estado === "publicada" ? "ocultar" : "publicar"}" data-id="${esc(r.id)}">${r.estado === "publicada" ? "Ocultar" : "Publicar"}</button></td></tr>`).join("")}
        </tbody></table></div>` : `<div class="empty">Todavía no hay reseñas.</div>`;
    }
    if (tab === "met") v.innerHTML = metricas();
  }

  function metricas() {
    const desde = Date.now() - 14 * 864e5;
    const c14 = CON.filter(c => new Date(c.created_at).getTime() >= desde);
    const aprob = TEC.filter(t => t.estado === "aprobado");
    const decididos = TEC.filter(t => t.estado !== "pendiente");
    const tasa = decididos.length ? Math.round(aprob.length / decididos.length * 100) : 0;
    const pub = RES.filter(r => r.estado === "publicada");
    const porOficio = Object.keys(OFICIOS).map(k => ({ k, n: c14.filter(c => (TEC.find(t => t.id === c.tecnico_id) || {}).oficio === k).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
    const maxO = Math.max(1, ...porOficio.map(x => x.n));
    const top = aprob.map(t => ({ t, n: c14.filter(c => c.tecnico_id === t.id).length })).sort((a, b) => b.n - a.n).slice(0, 8);
    const kpi = (v, l, s, ok) => `<div class="kpi"><b>${v}</b><span>${l}</span>${s ? `<small class="${ok ? "ok" : "no"}">${s}</small>` : ""}</div>`;
    return `<div class="kpis">
      ${kpi(aprob.length, "técnicos publicados", `${TEC.filter(t => t.estado === "pendiente").length} por revisar`, true)}
      ${kpi(tasa + " %", "perfiles aprobados de los revisados (H1)", tasa >= 50 ? "Cumple el criterio ≥ 50 %" : "Por debajo de 50 %", tasa >= 50)}
      ${kpi(c14.length, "clics a WhatsApp en 14 días (H2)", c14.length >= 60 ? "Cumple el criterio ≥ 60" : `Faltan ${60 - c14.length} para el criterio`, c14.length >= 60)}
      ${kpi(pub.length ? dec(avg(pub)) : "–", `calificación promedio (${pub.length} reseñas)`)}
    </div>
    <p class="note" style="margin-bottom:12px">H3 (contactos que terminan en servicio) y H4 (disposición a pagar) se miden con la encuesta semanal y las entrevistas a técnicos.</p>
    <div class="two" style="gap:16px">
      <div class="box"><h3 style="font-size:17px;margin-bottom:10px">Contactos por oficio, últimos 14 días</h3>
        ${porOficio.length ? `<div style="display:grid;gap:8px">${porOficio.map(x => `<div><div class="row" style="justify-content:space-between"><span>${esc(OFICIOS[x.k])}</span><b style="font-variant-numeric:tabular-nums">${x.n}</b></div><div class="bar" style="width:${x.n / maxO * 100}%"></div></div>`).join("")}</div>` : '<p class="note">Sin contactos en este periodo.</p>'}</div>
      <div class="tblwrap"><table><thead><tr><th>Técnico</th><th>Oficio</th><th>Contactos 14 d</th><th>Reseñas</th></tr></thead><tbody>
        ${top.map(x => `<tr><td>${esc(x.t.nombre)}</td><td>${esc(OFICIOS[x.t.oficio] || "")}</td><td>${x.n}</td><td>${resOf(x.t.id).length}</td></tr>`).join("") || '<tr><td colspan="4">Sin datos</td></tr>'}
      </tbody></table></div>
    </div>`;
  }

  // Confirmación en dos clics para acciones que no se deshacen.
  let armed = null;
  document.addEventListener("click", async e => {
    const t = e.target.closest(".tab"); if (t) { tab = t.dataset.tab; render(); return; }
    const b = e.target.closest("[data-act]"); if (!b) return;
    const { act, id } = b.dataset;
    if (act === "borrar" && armed !== b) { armed = b; b.textContent = "Toca otra vez para eliminar"; setTimeout(() => { if (armed === b) { armed = null; b.textContent = "Eliminar"; } }, 4000); return; }
    armed = null; b.disabled = true;
    try {
      if (act === "aprobarv") await store.updateTecnico(id, { estado: "aprobado", verificado: true });
      if (act === "aprobar") await store.updateTecnico(id, { estado: "aprobado" });
      if (act === "rechazar" || act === "retirar") await store.updateTecnico(id, { estado: "rechazado" });
      if (act === "verif") await store.updateTecnico(id, { verificado: !TEC.find(x => x.id === id).verificado });
      if (act === "borrar") await store.deleteTecnico(id);
      if (act === "ocultar") await store.updateResena(id, { estado: "oculta" });
      if (act === "publicar") await store.updateResena(id, { estado: "publicada" });
      toast({ aprobarv: "Técnico aprobado y verificado", aprobar: "Técnico publicado", rechazar: "Perfil rechazado", retirar: "Técnico retirado del directorio", verif: "Verificación actualizada", borrar: "Técnico eliminado", ocultar: "Reseña oculta", publicar: "Reseña publicada" }[act]);
      await reload();
    } catch (ex) { toast("No se pudo completar: " + ex.message, true); b.disabled = false; }
  });

  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    try { await store.login($("#lEmail").value.trim(), $("#lPass").value); $("#lErr").hidden = true; await boot(); }
    catch (ex) { $("#lErr").textContent = ex.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : ex.message; $("#lErr").hidden = false; }
  });
  $("#logout").addEventListener("click", async () => { await store.logout(); await boot(); });
  boot();
})();
