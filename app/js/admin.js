/* Panel de administración: aprobar técnicos, verificar, moderar reseñas, métricas del MVP
   y monetización (plan destacado, publicidad e ingresos). */
(function () {
  const { store, OFICIOS, PRECIOS, MEDIOS, esDestacado, hoy } = window.OS;
  const { $, $$, esc, cop, avg, dec, fecha, fechaCorta, sumarMeses, adCard, normTel, thumbs, header, toast } = window.UI;
  header("adm");

  let tab = "pend", TEC = [], RES = [], CON = [], ANU = [], PAG = [], monErr = "", openPay = null;

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
    // Monetización: si aún no se corrió supabase/monetizacion.sql, el resto del panel sigue funcionando.
    try { [ANU, PAG] = await Promise.all([store.adminAnuncios(), store.adminPagos()]); monErr = ""; }
    catch (e) { ANU = []; PAG = []; monErr = "Para usar la publicidad y los ingresos, corre el archivo supabase/monetizacion.sql en el SQL Editor de Supabase. Detalle: " + e.message; }
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
        ${esDestacado(t) ? `<div class="dest-line">★ Plan destacado vigente hasta el ${fechaCorta(t.destacado_hasta)}</div>` : ""}
      </div>
      <div class="acts">${actions}</div>
      ${openPay === "dest:" + t.id ? payForm("dest", t.id, PRECIOS.destacado, esDestacado(t) ? "Renovar plan destacado" : "Activar plan destacado") : ""}
    </div>`;
  }

  /* Formulario para registrar el pago de un plan (destacado o renovación de anuncio). */
  function payForm(kind, id, precio, titulo) {
    return `<div class="payform" data-kind="${kind}" data-id="${esc(id)}" data-precio="${precio}">
      <b style="flex-basis:100%">${titulo}</b>
      <div class="fld"><label>Meses</label><select class="pf-meses">${[1, 2, 3, 6, 12].map(m => `<option value="${m}">${m} ${m === 1 ? "mes" : "meses"}</option>`).join("")}</select></div>
      <div class="fld"><label>Medio de pago</label><select class="pf-medio">${MEDIOS.map(m => `<option>${m}</option>`).join("")}</select></div>
      <div class="fld"><label>Valor recibido (COP)</label><input type="number" class="pf-valor" min="0" step="1000" value="${precio}"></div>
      <button class="btn btn-pri sm" data-act="pagar">Registrar pago y activar</button>
      <button class="btn btn-ghost sm" data-act="cerrarpago">Cancelar</button>
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
          ? `<button class="btn btn-pri sm" data-act="abrirdest" data-id="${esc(t.id)}">${esDestacado(t) ? "Renovar destacado" : "Activar destacado"}</button>
             ${esDestacado(t) ? `<button class="btn btn-ghost sm" data-act="quitardest" data-id="${esc(t.id)}">Quitar destacado</button>` : ""}
             <button class="btn btn-ghost sm" data-act="verif" data-id="${esc(t.id)}">${t.verificado ? "Quitar verificación" : "Marcar verificado"}</button>
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
    if (tab === "pub") v.innerHTML = monErr ? `<div class="empty">${esc(monErr)}</div>` : publicidad();
    if (tab === "ing") v.innerHTML = monErr ? `<div class="empty">${esc(monErr)}</div>` : ingresos();
  }

  function estadoAnuncio(a) {
    if (!a.activo) return ["Pausado", "oculta"];
    if (a.hasta < hoy()) return ["Vencido", "rechazado"];
    return ["Activo", "aprobado"];
  }
  function publicidad() {
    const form = `<div class="box" style="margin-bottom:18px">
      <h3 style="font-size:18px;margin-bottom:10px">Nuevo anuncio de ferretería o distribuidor</h3>
      <form id="adForm" novalidate>
        <div class="f2">
          <div class="fld"><label for="adNeg">Nombre del negocio</label><input type="text" id="adNeg" maxlength="80"></div>
          <div class="fld"><label for="adWa">WhatsApp del negocio</label><input type="tel" id="adWa" placeholder="300 123 4567" maxlength="16"></div>
        </div>
        <div class="fld"><label for="adMsg">Mensaje del anuncio (máx. 160 caracteres)</label><input type="text" id="adMsg" maxlength="160" placeholder="Ej: Tubería y cables con 10 % de descuento para técnicos."></div>
        <div class="fld"><label for="adImg">Logo o foto (opcional)</label><input type="file" id="adImg" accept="image/*"></div>
        <div class="payform" data-kind="nuevoad" data-precio="${PRECIOS.publicidad}" style="margin:0">
          <b style="flex-basis:100%">Pago de la publicidad · ${cop(PRECIOS.publicidad)} al mes</b>
          <div class="fld"><label>Meses</label><select class="pf-meses">${[1, 2, 3, 6, 12].map(m => `<option value="${m}">${m} ${m === 1 ? "mes" : "meses"}</option>`).join("")}</select></div>
          <div class="fld"><label>Medio de pago</label><select class="pf-medio">${MEDIOS.map(m => `<option>${m}</option>`).join("")}</select></div>
          <div class="fld"><label>Valor recibido (COP)</label><input type="number" class="pf-valor" min="0" step="1000" value="${PRECIOS.publicidad}"></div>
        </div>
        <p class="err" id="adErr" hidden></p>
        <button class="btn btn-pri" type="submit" id="adBtn">Publicar anuncio y registrar pago</button>
      </form></div>`;
    const lista = ANU.length ? `<div class="admin-list">${ANU.map(a => {
      const [txt, cls] = estadoAnuncio(a);
      return `<div class="arow" style="grid-template-columns:minmax(0,260px) minmax(0,1fr) auto">
        <div>${adCard(a)}</div>
        <div style="display:grid;gap:4px;min-width:0">
          <div class="row" style="gap:8px"><b style="font-size:17px">${esc(a.negocio)}</b><span class="state ${cls}">${txt}</span></div>
          <div class="meta">Vigente hasta el ${fechaCorta(a.hasta)}${a.whatsapp ? " · WhatsApp +" + esc(a.whatsapp) : ""}</div>
          <div class="meta">Pagos registrados: ${cop(PAG.filter(p => p.referencia === a.id).reduce((s, p) => s + p.valor, 0))}</div>
        </div>
        <div class="acts">
          <button class="btn btn-pri sm" data-act="abrirad" data-id="${esc(a.id)}">Renovar</button>
          <button class="btn btn-ghost sm" data-act="${a.activo ? "pausarad" : "reanudarad"}" data-id="${esc(a.id)}">${a.activo ? "Pausar" : "Reanudar"}</button>
          <button class="btn btn-bad sm" data-act="borrarad" data-id="${esc(a.id)}">Eliminar</button>
        </div>
        ${openPay === "ad:" + a.id ? payForm("ad", a.id, PRECIOS.publicidad, "Renovar publicidad") : ""}
      </div>`;
    }).join("")}</div>` : `<div class="empty">Todavía no hay anuncios.</div>`;
    return form + lista;
  }

  function ingresos() {
    const mes = hoy().slice(0, 7);
    const delMes = PAG.filter(p => String(p.created_at).slice(0, 7) === mes);
    const suma = arr => arr.reduce((s, p) => s + (p.valor || 0), 0);
    const dest = TEC.filter(t => t.estado === "aprobado" && esDestacado(t));
    const anActivos = ANU.filter(a => a.activo && a.hasta >= hoy());
    const recurrente = dest.length * PRECIOS.destacado + anActivos.length * PRECIOS.publicidad;
    const kpi = (v, l, s) => `<div class="kpi"><b>${v}</b><span>${l}</span>${s ? `<small class="ok">${s}</small>` : ""}</div>`;
    return `<div class="kpis">
      ${kpi(cop(suma(delMes)), "ingresos de este mes", `${delMes.length} pagos`)}
      ${kpi(cop(suma(PAG)), "ingresos acumulados", `${PAG.length} pagos en total`)}
      ${kpi(dest.length, "técnicos con plan destacado", `${cop(dest.length * PRECIOS.destacado)} al mes`)}
      ${kpi(anActivos.length, "anuncios activos", `${cop(anActivos.length * PRECIOS.publicidad)} al mes`)}
    </div>
    <p class="note" style="margin-bottom:12px">Ingreso mensual recurrente con los planes vigentes: <b>${cop(recurrente)}</b>. Para los hogares el uso es gratis y no se cobra comisión por servicio.</p>
    <div class="tblwrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Medio</th><th>Meses</th><th>Valor</th></tr></thead><tbody>
      ${PAG.map(p => `<tr><td>${fecha(p.created_at)}</td><td>${esc(p.concepto)}</td><td>${p.tipo === "destacado" ? "Plan destacado" : "Publicidad"}</td><td>${esc(p.medio)}</td><td>${p.meses}</td><td><b>${cop(p.valor)}</b></td></tr>`).join("") || '<tr><td colspan="6">Todavía no hay pagos registrados.</td></tr>'}
    </tbody></table></div>`;
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
    if (act === "abrirdest") { openPay = "dest:" + id; render(); return; }
    if (act === "abrirad") { openPay = "ad:" + id; render(); return; }
    if (act === "cerrarpago") { openPay = null; render(); return; }
    if (act === "borrarad" && armed !== b) { armed = b; b.textContent = "Toca otra vez para eliminar"; setTimeout(() => { if (armed === b) { armed = null; b.textContent = "Eliminar"; } }, 4000); return; }
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
      if (act === "quitardest") await store.updateTecnico(id, { destacado_hasta: null });
      if (act === "pausarad") await store.updateAnuncio(id, { activo: false });
      if (act === "reanudarad") await store.updateAnuncio(id, { activo: true });
      if (act === "borrarad") await store.deleteAnuncio(id);
      if (act === "pagar") {
        const f = b.closest(".payform"), kind = f.dataset.kind, rid = f.dataset.id;
        const meses = +f.querySelector(".pf-meses").value, medio = f.querySelector(".pf-medio").value, valor = Math.max(0, parseInt(f.querySelector(".pf-valor").value, 10) || 0);
        if (kind === "dest") {
          const t = TEC.find(x => x.id === rid);
          const hasta = sumarMeses(esDestacado(t) ? t.destacado_hasta : hoy(), meses);
          await store.updateTecnico(rid, { destacado_hasta: hasta });
          await store.registrarPago({ tipo: "destacado", referencia: rid, concepto: "Plan destacado · " + t.nombre, valor, medio, meses });
        } else {
          const a = ANU.find(x => x.id === rid);
          const hasta = sumarMeses(a.hasta >= hoy() ? a.hasta : hoy(), meses);
          await store.updateAnuncio(rid, { hasta, activo: true });
          await store.registrarPago({ tipo: "publicidad", referencia: rid, concepto: "Publicidad · " + a.negocio, valor, medio, meses });
        }
        openPay = null;
      }
      toast({ aprobarv: "Técnico aprobado y verificado", aprobar: "Técnico publicado", rechazar: "Perfil rechazado", retirar: "Técnico retirado del directorio", verif: "Verificación actualizada", borrar: "Técnico eliminado", ocultar: "Reseña oculta", publicar: "Reseña publicada",
        quitardest: "Plan destacado retirado", pausarad: "Anuncio pausado", reanudarad: "Anuncio reanudado", borrarad: "Anuncio eliminado", pagar: "Pago registrado y plan activado" }[act]);
      await reload();
    } catch (ex) { toast("No se pudo completar: " + ex.message, true); b.disabled = false; }
  });

  // El valor se calcula solo al cambiar los meses (se puede editar si hubo descuento).
  document.addEventListener("change", e => {
    if (!e.target.classList.contains("pf-meses")) return;
    const f = e.target.closest(".payform");
    f.querySelector(".pf-valor").value = (+f.dataset.precio) * (+e.target.value);
  });

  document.addEventListener("submit", async e => {
    if (e.target.id !== "adForm") return;
    e.preventDefault();
    const negocio = $("#adNeg").value.trim(), mensaje = $("#adMsg").value.trim(), telRaw = $("#adWa").value.trim();
    const whatsapp = telRaw ? normTel(telRaw) : null;
    const f = e.target.querySelector(".payform");
    const meses = +f.querySelector(".pf-meses").value, medio = f.querySelector(".pf-medio").value, valor = Math.max(0, parseInt(f.querySelector(".pf-valor").value, 10) || 0);
    const err = [];
    if (negocio.length < 2) err.push("el nombre del negocio");
    if (telRaw && !whatsapp) err.push("un WhatsApp válido de 10 dígitos");
    if (err.length) { $("#adErr").textContent = "Falta " + err.join(" y ") + "."; $("#adErr").hidden = false; return; }
    const btn = $("#adBtn"); btn.disabled = true; btn.textContent = "Publicando…";
    try {
      const a = await store.crearAnuncio({ negocio, mensaje, whatsapp, activo: true, hasta: sumarMeses(hoy(), meses) }, $("#adImg").files[0] || null);
      await store.registrarPago({ tipo: "publicidad", referencia: a.id, concepto: "Publicidad · " + negocio, valor, medio, meses });
      toast("Anuncio publicado y pago registrado");
      await reload();
    } catch (ex) { $("#adErr").textContent = "No se pudo publicar: " + ex.message; $("#adErr").hidden = false; btn.disabled = false; btn.textContent = "Publicar anuncio y registrar pago"; }
  });

  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    try { await store.login($("#lEmail").value.trim(), $("#lPass").value); $("#lErr").hidden = true; await boot(); }
    catch (ex) { $("#lErr").textContent = ex.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : ex.message; $("#lErr").hidden = false; }
  });
  $("#logout").addEventListener("click", async () => { await store.logout(); await boot(); });
  boot();
})();
