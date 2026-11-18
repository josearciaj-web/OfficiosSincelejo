/* Panel de administración: aprobar técnicos, verificar, moderar reseñas, métricas del MVP
   y monetización (plan destacado, publicidad e ingresos). */
(function () {
  const { store, OFICIOS, BARRIOS, PRECIOS, MEDIOS, esDestacado, hoy } = window.OS;
  const { $, $$, esc, cop, avg, dec, fecha, fechaCorta, sumarMeses, adCard, normTel, thumbs, header, toast } = window.UI;
  header("adm");

  let tab = "pend", TEC = [], RES = [], CON = [], ANU = [], PAG = [], PIL = [], monErr = "", pilErr = "", openPay = null, openEdit = null;

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
    try { PIL = await store.adminPiloto(); pilErr = ""; }
    catch (e) { PIL = []; pilErr = "Para registrar el piloto, corre el archivo supabase/piloto.sql en el SQL Editor de Supabase. Detalle: " + e.message; }
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
      ${openEdit === t.id ? editForm(t) : ""}
      ${openPay === "dest:" + t.id ? payForm("dest", t.id, PRECIOS.destacado, esDestacado(t) ? "Renovar plan destacado" : "Activar plan destacado") : ""}
    </div>`;
  }

  /* Formulario para corregir los datos que el técnico digitó mal. */
  function editForm(t) {
    const tel = String(t.whatsapp || "").replace(/\D/g, "").replace(/^57/, "");
    const bs = [...new Set([...BARRIOS, ...(t.barrios || [])])];
    return `<form class="payform editform" data-id="${esc(t.id)}">
      <b style="flex-basis:100%">Editar perfil</b>
      <div class="fld" style="flex:1 1 220px"><label>Nombre completo</label><input class="ef-nombre" maxlength="80" value="${esc(t.nombre)}"></div>
      <div class="fld"><label>Celular (WhatsApp)</label><input class="ef-tel" inputmode="numeric" maxlength="13" value="${esc(tel)}"></div>
      <div class="fld"><label>Oficio</label><select class="ef-oficio">${Object.entries(OFICIOS).map(([k, v]) => `<option value="${k}" ${k === t.oficio ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></div>
      <div class="fld"><label>Años de experiencia</label><input type="number" class="ef-anios" min="0" max="60" value="${t.anios || 0}"></div>
      <div class="fld"><label>Tarifa de visita (COP)</label><input type="number" class="ef-tarifa" min="0" max="2000000" step="1000" value="${t.tarifa || 0}"></div>
      <div class="fld" style="flex-basis:100%"><span class="lbl">Barrios donde trabaja</span><div class="checks">${bs.map((b, i) => `<label><input type="checkbox" class="ef-b" value="${esc(b)}" ${(t.barrios || []).includes(b) ? "checked" : ""}> ${esc(b)}</label>`).join("")}</div></div>
      <div class="fld" style="flex-basis:100%"><label>Descripción</label><textarea class="ef-desc" maxlength="300" rows="3">${esc(t.descripcion || "")}</textarea></div>
      <button class="btn btn-pri sm" type="submit">Guardar cambios</button>
      <button class="btn btn-ghost sm" type="button" data-act="cerraredit">Cancelar</button>
    </form>`;
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
        `<button class="btn btn-ghost sm" data-act="editar" data-id="${esc(t.id)}">Editar</button>
         <button class="btn btn-pri sm" data-act="aprobarv" data-id="${esc(t.id)}">Aprobar y verificar</button>
         <button class="btn btn-ghost sm" data-act="aprobar" data-id="${esc(t.id)}">Aprobar sin verificar</button>
         <button class="btn btn-bad sm" data-act="rechazar" data-id="${esc(t.id)}">Rechazar</button>`)).join("")}</div>`
        : `<div class="empty">No hay perfiles por revisar.</div>`;
    }
    if (tab === "tec") {
      const p = TEC.filter(t => t.estado !== "pendiente");
      v.innerHTML = p.length ? `<div class="admin-list">${p.map(t => tecRow(t,
        `<button class="btn btn-ghost sm" data-act="editar" data-id="${esc(t.id)}">Editar</button>` + (t.estado === "aprobado"
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

  /* Validación del piloto: las cuatro hipótesis de la Tabla 6 calculadas con datos reales.
     H1 y H4 salen de las visitas y entrevistas que registra el equipo, H2 de los clics a WhatsApp
     y H3 de la encuesta semanal a los técnicos (servicios conseguidos por la plataforma). */
  const CRIT = { h1: 50, h2: 60, h3: 25, h4: 30 };
  function hipotesis() {
    const conv = PIL.filter(r => r.tipo === "convocatoria"), prec = PIL.filter(r => r.tipo === "precio"), serv = PIL.filter(r => r.tipo === "servicio");
    const pct = (a, b) => b ? Math.round(a / b * 100) : null;
    const desde = Date.now() - 14 * 864e5;
    const c14 = CON.filter(c => new Date(c.created_at).getTime() >= desde).length;
    const servicios = serv.reduce((s, r) => s + (r.cantidad || 0), 0);
    const h1a = conv.filter(r => r.acepta).length, h4a = prec.filter(r => r.acepta).length;
    return {
      h1: { v: pct(h1a, conv.length), txt: `${h1a} de ${conv.length} técnicos visitados aceptaron publicar su perfil` },
      h2: { v: c14, txt: `${c14} clics al botón de WhatsApp en los últimos 14 días (${CON.length} en total)` },
      h3: { v: pct(servicios, CON.length), txt: `${servicios} servicios conseguidos de ${CON.length} contactos registrados` },
      h4: { v: pct(h4a, prec.length), txt: `${h4a} de ${prec.length} técnicos entrevistados aceptan pagar el plan destacado` },
    };
  }
  function metricas() {
    if (pilErr) return `<div class="empty">${esc(pilErr)}</div>`;
    const H = hipotesis();
    const kpi = (k, nombre, unidad) => {
      const h = H[k], c = CRIT[k], sin = h.v === null;
      const ok = !sin && h.v >= c;
      return `<div class="kpi"><b>${sin ? "–" : h.v + unidad}</b><span>${nombre}</span><small class="${ok ? "ok" : "no"}">${sin ? "Sin registros todavía" : ok ? `Cumple (criterio ≥ ${c}${unidad})` : `No cumple (criterio ≥ ${c}${unidad})`}</small><span style="display:block;margin-top:4px">${esc(h.txt)}</span></div>`;
    };
    const aprob = TEC.filter(t => t.estado === "aprobado");
    const opts = aprob.map(t => `<option value="${esc(t.id)}">${esc(t.nombre)}</option>`).join("");
    const tipoTxt = { convocatoria: "Visita (H1)", precio: "Entrevista de precio (H4)", servicio: "Encuesta semanal (H3)" };
    const det = r => r.tipo === "servicio" ? `${r.cantidad} servicio${r.cantidad === 1 ? "" : "s"}` : r.tipo === "precio" ? `${r.acepta ? "Acepta" : "No acepta"} ${cop(r.precio || 0)} al mes` : (r.acepta ? "Aceptó" : "No aceptó");
    return `<div class="kpis">
      ${kpi("h1", "H1. Técnicos que aceptan publicar gratis", " %")}
      ${kpi("h2", "H2. Clics a WhatsApp en 14 días", "")}
      ${kpi("h3", "H3. Contactos que terminan en servicio", " %")}
      ${kpi("h4", "H4. Técnicos que pagarían el plan destacado", " %")}
    </div>
    <p class="note" style="margin-bottom:14px">Registra aquí cada visita, entrevista y encuesta del piloto. Los porcentajes se calculan solos con los datos guardados en la base de datos. Usa <b>Exportar evidencias</b> para sacar el archivo CSV que respalda la Tabla 6 del informe.</p>
    <div class="pilgrid">
      <form class="box pil" data-tipo="convocatoria"><h3 style="font-size:17px;margin-bottom:10px">Visita a técnico (H1)</h3>
        <div class="fld"><label>Nombre del técnico</label><input type="text" class="p-nombre" maxlength="80"></div>
        <div class="fld"><label>¿Aceptó publicar su perfil gratis?</label><select class="p-acepta"><option value="1">Sí</option><option value="0">No</option></select></div>
        <div class="fld"><label>Lugar o nota (opcional)</label><input type="text" class="p-nota" maxlength="200" placeholder="Ej: Ferretería del Centro"></div>
        <button class="btn btn-pri sm" type="submit">Guardar visita</button></form>
      <form class="box pil" data-tipo="precio"><h3 style="font-size:17px;margin-bottom:10px">Entrevista de precio (H4)</h3>
        <div class="fld"><label>Nombre del técnico</label><input type="text" class="p-nombre" maxlength="80"></div>
        <div class="f2"><div class="fld"><label>Precio ofrecido al mes</label><input type="number" class="p-precio" min="0" step="1000" value="${PRECIOS.destacado}"></div>
        <div class="fld"><label>¿Acepta y deja sus datos?</label><select class="p-acepta"><option value="1">Sí</option><option value="0">No</option></select></div></div>
        <div class="fld"><label>Lo que dijo (opcional)</label><input type="text" class="p-nota" maxlength="200"></div>
        <button class="btn btn-pri sm" type="submit">Guardar entrevista</button></form>
      <form class="box pil" data-tipo="servicio"><h3 style="font-size:17px;margin-bottom:10px">Encuesta semanal (H3)</h3>
        ${opts ? `<div class="fld"><label>Técnico del directorio</label><select class="p-tec">${opts}</select></div>
        <div class="fld"><label>Servicios que consiguió por la plataforma esta semana</label><input type="number" class="p-cant" min="0" max="100" value="0"></div>
        <div class="fld"><label>Nota (opcional)</label><input type="text" class="p-nota" maxlength="200"></div>
        <button class="btn btn-pri sm" type="submit">Guardar encuesta</button>` : '<p class="note">Primero aprueba técnicos en el directorio.</p>'}</form>
    </div>
    <div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 style="font-size:17px">Registros del piloto (${PIL.length})</h3><button class="btn btn-ghost sm" data-act="exportar">Exportar evidencias (CSV)</button></div>
    <div class="tblwrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Técnico</th><th>Resultado</th><th>Nota</th><th></th></tr></thead><tbody>
      ${PIL.map(r => `<tr><td>${fecha(r.created_at)}</td><td>${tipoTxt[r.tipo]}</td><td>${esc(r.nombre)}</td><td>${det(r)}</td><td style="overflow-wrap:anywhere">${esc(r.nota || "")}</td><td><button class="btn btn-bad sm" data-act="borrarpil" data-id="${esc(r.id)}">Eliminar</button></td></tr>`).join("") || '<tr><td colspan="6">Todavía no hay registros del piloto.</td></tr>'}
    </tbody></table></div>`;
  }

  /* CSV con el resumen de las hipótesis, cada registro del piloto y cada clic a WhatsApp. */
  function exportar() {
    const H = hipotesis(), q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const filas = [["Seccion", "Fecha", "Tipo", "Tecnico", "Resultado", "Nota"]];
    [["H1", "≥ 50 %"], ["H2", "≥ 60 clics"], ["H3", "≥ 25 %"], ["H4", "≥ 30 %"]].forEach(([k, c]) => {
      const h = H[k.toLowerCase()]; filas.push(["Resumen", new Date().toISOString().slice(0, 10), k, "", h.v === null ? "sin registros" : h.v + (k === "H2" ? " clics" : " %"), h.txt + " · criterio " + c]);
    });
    PIL.forEach(r => filas.push(["Piloto", r.created_at, r.tipo, r.nombre, r.tipo === "servicio" ? r.cantidad + " servicios" : (r.acepta ? "acepta" : "no acepta") + (r.tipo === "precio" ? " " + r.precio : ""), r.nota || ""]));
    CON.forEach(c => filas.push(["Clic WhatsApp", c.created_at, "contacto", (TEC.find(t => t.id === c.tecnico_id) || {}).nombre || "", "", c.barrio || ""]));
    const blob = new Blob(["﻿" + filas.map(f => f.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "evidencias_piloto_" + hoy() + ".csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
    if (act === "editar") { openEdit = openEdit === id ? null : id; render(); return; }
    if (act === "cerraredit") { openEdit = null; render(); return; }
    if (act === "exportar") { exportar(); return; }
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
      if (act === "borrarpil") await store.deletePiloto(id);
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
        quitardest: "Plan destacado retirado", pausarad: "Anuncio pausado", reanudarad: "Anuncio reanudado", borrarad: "Anuncio eliminado", borrarpil: "Registro eliminado", pagar: "Pago registrado y plan activado" }[act]);
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
    if (e.target.classList.contains("editform")) {
      e.preventDefault();
      const f = e.target, q = c => f.querySelector(c), err = [];
      const nombre = q(".ef-nombre").value.trim().replace(/\s+/g, " ");
      const tel = q(".ef-tel").value.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");
      const barrios = [...f.querySelectorAll(".ef-b:checked")].map(x => x.value);
      const anios = parseInt(q(".ef-anios").value, 10), tarifa = parseInt(q(".ef-tarifa").value, 10);
      if (nombre.length < 5) err.push("el nombre (mínimo 5 letras)");
      if (!/^3\d{9}$/.test(tel)) err.push("un celular de 10 dígitos que empiece por 3");
      if (!barrios.length) err.push("al menos un barrio");
      if (!(anios >= 0 && anios <= 60)) err.push("años de experiencia entre 0 y 60");
      if (!(tarifa >= 0 && tarifa <= 2000000)) err.push("una tarifa válida");
      if (err.length) { toast("Revisa " + err.join(", "), true); return; }
      const b = f.querySelector("button[type=submit]"); b.disabled = true;
      try {
        await store.updateTecnico(f.dataset.id, { nombre, whatsapp: "57" + tel, oficio: q(".ef-oficio").value, barrios, anios, tarifa, descripcion: q(".ef-desc").value.trim() });
        openEdit = null; toast("Perfil actualizado"); await reload();
      } catch (ex) { toast("No se pudo guardar: " + ex.message, true); b.disabled = false; }
      return;
    }
    if (e.target.classList.contains("pil")) {
      e.preventDefault();
      const f = e.target, tipo = f.dataset.tipo, v = c => (f.querySelector(c) || {}).value;
      const r = { tipo, nota: (v(".p-nota") || "").trim() || null };
      if (tipo === "servicio") {
        const t = TEC.find(x => x.id === v(".p-tec")); r.tecnico_id = t.id; r.nombre = t.nombre;
        r.cantidad = Math.max(0, Math.min(100, parseInt(v(".p-cant"), 10) || 0));
      } else {
        r.nombre = (v(".p-nombre") || "").trim(); r.acepta = v(".p-acepta") === "1";
        if (tipo === "precio") r.precio = Math.max(0, parseInt(v(".p-precio"), 10) || 0);
        if (r.nombre.length < 3) { toast("Escribe el nombre del técnico", true); return; }
      }
      const b = f.querySelector("button[type=submit]"); b.disabled = true;
      try { await store.addPiloto(r); toast("Registro del piloto guardado"); await reload(); }
      catch (ex) { toast("No se pudo guardar: " + ex.message, true); b.disabled = false; }
      return;
    }
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
