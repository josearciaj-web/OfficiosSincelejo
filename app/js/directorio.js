/* Página pública: directorio, perfil, contacto por WhatsApp y reseñas. */
(function () {
  const { store, OFICIOS, BARRIOS, esDestacado } = window.OS;
  const { adCard, $, esc, safeFotos, cop, avg, dec, fecha, waUrl, icon, WA_ICON, thumbs, starsLine, header, toast } = window.UI;
  header("dir");

  let TEC = [], ANUN = [];
  let state = { oficio: "", barrio: "", orden: "rating", q: "" };
  try { const s = JSON.parse(localStorage.getItem("os-filtros") || "null"); if (s) state = { ...state, ...s, q: "" }; } catch (e) {}
  const save = () => { try { localStorage.setItem("os-filtros", JSON.stringify({ oficio: state.oficio, barrio: state.barrio, orden: state.orden })); } catch (e) {} };

  const msgCliente = t => `Hola ${t.nombre.split(" ")[0]}, te contacto desde OficiosSincelejo. Necesito un servicio de ${(OFICIOS[t.oficio] || "").toLowerCase()}${state.barrio && state.barrio !== "Toda la ciudad" ? ` en el barrio ${state.barrio}` : ""}. ¿Tienes disponibilidad?`;

  function renderFilters() {
    const all = [["", "Todos", ""], ...Object.entries(OFICIOS).map(([k, v]) => [k, v, icon(k)])];
    $("#oficios").innerHTML = all.map(([k, n, ic]) => `<button class="of" type="button" data-k="${k}" aria-pressed="${state.oficio === k}">${ic}${n}</button>`).join("");
    $("#barrio").innerHTML = `<option value="">Todos los barrios</option>` + BARRIOS.filter(b => b !== "Toda la ciudad").map(b => `<option ${state.barrio === b ? "selected" : ""}>${esc(b)}</option>`).join("");
    $("#orden").value = state.orden;
  }

  function list() {
    const q = state.q.trim().toLowerCase();
    const r = TEC.filter(t => (!state.oficio || t.oficio === state.oficio)
      && (!state.barrio || (t.barrios || []).includes(state.barrio) || (t.barrios || []).includes("Toda la ciudad"))
      && (!q || (t.nombre + " " + (t.descripcion || "")).toLowerCase().includes(q)));
    const sorts = {
      rating: (a, b) => avg(b.resenas) - avg(a.resenas) || b.resenas.length - a.resenas.length,
      resenas: (a, b) => b.resenas.length - a.resenas.length,
      precio: (a, b) => (a.tarifa || 0) - (b.tarifa || 0),
      exp: (a, b) => (b.anios || 0) - (a.anios || 0),
    };
    // Los técnicos con plan destacado vigente salen primero; dentro de cada grupo se respeta el orden elegido.
    return r.sort(sorts[state.orden] || sorts.rating).sort((a, b) => esDestacado(b) - esDestacado(a));
  }

  function render() {
    const r = list();
    $("#count").textContent = `${r.length} ${r.length === 1 ? "técnico" : "técnicos"}`;
    if (!TEC.length) { $("#grid").innerHTML = `<div class="empty" style="grid-column:1/-1"><b>Todavía no hay técnicos publicados.</b><br>Cuando el equipo apruebe los primeros perfiles aparecerán aquí. <a href="registro.html">Registra el tuyo</a>.</div>`; return; }
    if (!r.length) { $("#grid").innerHTML = `<div class="empty" style="grid-column:1/-1"><b>No hay técnicos con esos filtros.</b><br>Prueba con otro barrio o con todos los oficios.</div>`; return; }
    const cards = r.map(t => `
      <article class="card${esDestacado(t) ? " dest" : ""}">
        <div class="thumbs">${thumbs(t)}</div>
        <div class="cbody">
          ${esDestacado(t) ? '<span class="badge-dest">★ Destacado</span>' : ""}
          <div class="name"><h3>${esc(t.nombre)}</h3>${t.verificado ? '<span class="verif">✓ Cédula verificada</span>' : ""}</div>
          <div class="meta">${esc(OFICIOS[t.oficio] || t.oficio)} · ${t.anios || 0} años de experiencia</div>
          <div>${starsLine(t.resenas)}</div>
          <div class="price">Visita desde ${cop(t.tarifa)} <small>tarifa base</small></div>
          <div class="meta">${(t.barrios || []).map(esc).join(", ")}</div>
          <div class="actions">
            <button class="btn btn-ghost" type="button" data-ver="${esc(t.id)}">Ver perfil</button>
            <a class="btn btn-wa" data-wa="${esc(t.id)}" href="${waUrl(t.whatsapp, msgCliente(t))}" target="_blank" rel="noopener">${WA_ICON}WhatsApp</a>
          </div>
        </div>
      </article>`);
    // Un anuncio después del 3.er técnico y luego cada 6
    if (ANUN.length) {
      if (cards.length < 3) cards.push(adCard(ANUN[0]));
      else for (let pos = 3, k = 0; pos <= cards.length && k < ANUN.length * 3; pos += 4, k++) cards.splice(pos, 0, adCard(ANUN[k % ANUN.length]));
    }
    $("#grid").innerHTML = cards.join("");
  }

  let lastFocus = null, current = null;
  async function openProfile(id) {
    const t = TEC.find(x => x.id === id); if (!t) return;
    current = t;
    lastFocus = document.activeElement;
    $("#ov").hidden = false; document.body.style.overflow = "hidden";
    $("#panel").innerHTML = `<p class="loading">Cargando perfil…</p>`;
    let resenas = [];
    try { resenas = await store.getResenas(t.id); } catch (e) { toast("No se pudieron cargar las reseñas: " + e.message, true); }
    const msg = msgCliente(t);
    const fotos = safeFotos(t);
    const gal = fotos.length
      ? `<div class="gal">${fotos.map(f => `<a href="${esc(f)}" target="_blank" rel="noopener"><img class="thumb" src="${esc(f)}" alt="Trabajo de ${esc(t.nombre)}" loading="lazy"></a>`).join("")}</div>`
      : `<div class="gal">${thumbs(t)}</div><p class="note">Este técnico aún no ha subido fotos de sus trabajos.</p>`;
    $("#panel").innerHTML = `
      <div class="ph"><div>${esDestacado(t) ? '<span class="badge-dest">★ Destacado</span>' : ""}<h2 id="pName">${esc(t.nombre)}</h2><div class="meta">${esc(OFICIOS[t.oficio] || t.oficio)}${t.verificado ? ' · <span class="verif">✓ Cédula verificada</span>' : ""}</div></div><button class="close" type="button" aria-label="Cerrar" id="pClose">×</button></div>
      <div class="facts">
        <div class="fact"><b>${t.anios || 0}</b><span>años de experiencia</span></div>
        <div class="fact"><b>${resenas.length ? dec(avg(resenas)) : "–"}</b><span>${resenas.length} ${resenas.length === 1 ? "reseña" : "reseñas"}</span></div>
        <div class="fact"><b>${cop(t.tarifa)}</b><span>visita o diagnóstico</span></div>
      </div>
      ${t.descripcion ? `<div class="sec"><h3>Lo que hace</h3><p style="margin:0">${esc(t.descripcion)}</p></div>` : ""}
      <div class="sec"><h3>Trabajos realizados</h3>${gal}</div>
      <div class="sec"><h3>Barrios donde trabaja</h3><div class="meta">${(t.barrios || []).map(esc).join(", ")}</div></div>
      <div class="sec"><h3>Contactar</h3><div style="display:grid;gap:10px">
        <div class="msg">${esc(msg)}</div>
        <a class="btn btn-wa" data-wa="${esc(t.id)}" href="${waUrl(t.whatsapp, msg)}" target="_blank" rel="noopener">${WA_ICON}Escribir por WhatsApp</a>
        <p class="note">Número: <b>+${esc(String(t.whatsapp).replace(/\D/g, ""))}</b>. Si el botón no abre WhatsApp, guarda el número y escríbele.</p>
      </div></div>
      <div class="sec"><h3>Reseñas</h3><div style="display:grid;gap:8px" id="revs">
        ${resenas.length ? resenas.map(r => `<div class="rev"><span class="stars">${"★".repeat(r.estrellas)}${"☆".repeat(5 - r.estrellas)}</span>${r.texto ? `<p>${esc(r.texto)}</p>` : ""}<span class="who">${esc(r.autor)} · ${fecha(r.created_at)}</span></div>`).join("") : '<p class="note">Este técnico aún no tiene reseñas.</p>'}
      </div></div>
      <div class="sec box"><h3>¿Ya te atendió? Deja tu reseña</h3>
        <form id="revForm" novalidate>
          <div class="fld"><span class="lbl">Calificación</span>
            <div class="starpick" role="radiogroup" aria-label="Calificación de 1 a 5">
              ${[5, 4, 3, 2, 1].map(n => `<input type="radio" name="est" id="est${n}" value="${n}"><label for="est${n}" title="${n} de 5">★</label>`).join("")}
            </div></div>
          <div class="fld"><label for="revAutor">Tu nombre</label><input type="text" id="revAutor" maxlength="60" placeholder="Ej: María José R."></div>
          <div class="fld"><label for="revTexto">Comentario</label><textarea id="revTexto" maxlength="400" placeholder="¿Cómo fue el servicio? ¿Llegó a tiempo? ¿El precio fue el acordado?"></textarea></div>
          <p class="err" id="revErr" hidden></p>
          <button class="btn btn-pri" type="submit">Publicar reseña</button>
        </form></div>
      <p class="note">La tarifa base es una referencia. El precio final lo acuerdas directo con el técnico según el trabajo.</p>`;
    $("#pClose").focus();
  }
  function closeProfile() { $("#ov").hidden = true; document.body.style.overflow = ""; current = null; lastFocus && lastFocus.focus(); }

  document.addEventListener("submit", async e => {
    if (e.target.id !== "revForm") return;
    e.preventDefault();
    const est = +((document.querySelector('input[name="est"]:checked') || {}).value || 0);
    const autor = $("#revAutor").value.trim(), texto = $("#revTexto").value.trim();
    const errs = [];
    if (!est) errs.push("elige de 1 a 5 estrellas");
    if (autor.length < 2) errs.push("escribe tu nombre");
    if (errs.length) { $("#revErr").textContent = "Falta: " + errs.join(" y ") + "."; $("#revErr").hidden = false; return; }
    const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Publicando…";
    try {
      await store.crearResena({ tecnico_id: current.id, autor, estrellas: est, texto });
      toast("Reseña publicada. Gracias por ayudar a otros hogares.");
      await load(); openProfile(current.id);
    } catch (err) { $("#revErr").textContent = "No se pudo publicar: " + err.message; $("#revErr").hidden = false; btn.disabled = false; btn.textContent = "Publicar reseña"; }
  });

  // Registrar cada clic a WhatsApp (métrica H2 del MVP). El enlace se abre normal.
  document.addEventListener("click", e => {
    const wa = e.target.closest("[data-wa]");
    if (wa) store.registrarContacto(wa.dataset.wa, state.barrio);
    const v = e.target.closest("[data-ver]"); if (v) openProfile(v.dataset.ver);
    if (e.target.id === "ov" || e.target.id === "pClose") closeProfile();
    const b = e.target.closest(".of"); if (b) { state.oficio = b.dataset.k; save(); renderFilters(); render(); }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#ov").hidden) closeProfile(); });
  $("#barrio").addEventListener("change", e => { state.barrio = e.target.value; save(); render(); });
  $("#orden").addEventListener("change", e => { state.orden = e.target.value; save(); render(); });
  $("#q").addEventListener("input", e => { state.q = e.target.value; render(); });

  async function load() {
    try { ANUN = await store.listAnuncios(); } catch (e) { ANUN = []; }
    try { TEC = await store.listTecnicos(); }
    catch (e) { $("#grid").innerHTML = `<div class="empty" style="grid-column:1/-1"><b>No se pudieron cargar los técnicos.</b><br>${esc(e.message)}</div>`; return; }
    render();
  }
  renderFilters(); load();
})();
