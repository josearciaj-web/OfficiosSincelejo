/* Utilidades de interfaz compartidas por las páginas de la app. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cop = n => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
  const avg = rs => rs && rs.length ? rs.reduce((a, r) => a + r.estrellas, 0) / rs.length : 0;
  const dec = n => n.toFixed(1).replace(".", ",");
  const fecha = iso => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  const waUrl = (num, msg) => `https://wa.me/${String(num || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  /* Solo se muestran fotos con URL https o imágenes incrustadas (evita enlaces maliciosos). */
  const safeFotos = t => (t.fotos || []).filter(f => typeof f === "string" && /^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(f));
  /* Normaliza un celular colombiano a 57XXXXXXXXXX. Devuelve "" si no es válido. */
  const normTel = t => { const d = String(t).replace(/\D/g, ""); if (/^3\d{9}$/.test(d)) return "57" + d; if (/^573\d{9}$/.test(d)) return d; return ""; };

  const ICONS = {
    plomeria: '<path d="M4 10h8a3 3 0 0 1 3 3v7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4 7v6M18 20h-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M19 5c0 1.5-1.2 3-1.2 3S16.6 6.5 16.6 5a1.2 1.2 0 0 1 2.4 0Z" fill="currentColor"/>',
    electricidad: '<path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" fill="currentColor"/>',
    aire: '<rect x="3" y="5" width="18" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 16v3M12 16v4M17 16v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    pintura: '<rect x="4" y="3" width="14" height="6" rx="1.5" fill="currentColor"/><path d="M18 6h2v5h-8v3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10.5" y="14" width="3" height="7" rx="1" fill="currentColor"/>',
    carpinteria: '<path d="M3 17 14 6l4 4L7 21H3v-4Z" fill="currentColor"/><path d="m15 5 2-2 4 4-2 2" fill="none" stroke="currentColor" stroke-width="2"/>',
    cerrajeria: '<circle cx="8" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 12h9M18 12v3M21 12v3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    refrigeracion: '<rect x="6" y="2" width="12" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 9h12M9 5v2M9 12v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    construccion: '<path d="M3 20h18M5 20V10h6v10M13 20V6h6v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  };
  const COLORS = { plomeria: "#0B6E99", electricidad: "#B36F00", aire: "#2E7D8C", pintura: "#9C3D6B", carpinteria: "#7A5230", cerrajeria: "#4F5B66", refrigeracion: "#3D6FB3", construccion: "#8A5A2B" };
  const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ICONS.construccion}</svg>`;
  const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.8-1.1-4.6-4-4.8-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>';

  /* Galería: fotos reales o, si no hay, mosaicos del color del oficio. */
  function thumbs(t, n = 3) {
    const fotos = safeFotos(t).slice(0, n);
    if (fotos.length) return fotos.map(f => `<img class="thumb" src="${esc(f)}" alt="Trabajo de ${esc(t.nombre)}" loading="lazy">`).join("")
      + Array(Math.max(0, n - fotos.length)).fill(`<div class="thumb" style="background:${COLORS[t.oficio] || "#556"}22"></div>`).join("");
    const c = COLORS[t.oficio] || "#556";
    return Array(n).fill(0).map((_, i) => `<div class="thumb ph" style="background:linear-gradient(${135 + i * 40}deg, ${c}, ${c}bb)">${icon(t.oficio)}</div>`).join("");
  }
  function starsLine(rs) {
    return rs && rs.length
      ? `<span class="stars">★ ${dec(avg(rs))}</span> <span class="meta">(${rs.length} ${rs.length === 1 ? "reseña" : "reseñas"})</span>`
      : `<span class="meta">Sin reseñas todavía</span>`;
  }

  /* Encabezado común con navegación. */
  function header(active) {
    const s = window.OS.store;
    const links = [["index.html", "Buscar técnico", "dir"], ["registro.html", "Soy técnico", "reg"], ["planes.html", "Planes", "pla"], ["admin.html", "Administración", "adm"]];
    const demo = s.mode === "demo"
      ? `<div class="banner demo"><div class="wrap"><b>Modo demostración.</b> Los datos se guardan solo en este navegador. Los técnicos son ficticios. Para guardar datos reales configura Supabase en <code>app/js/config.js</code>.</div></div>` : "";
    const err = s.configError ? `<div class="banner err"><div class="wrap">${esc(s.configError)}</div></div>` : "";
    document.body.insertAdjacentHTML("afterbegin", `${err}${demo}
      <header class="top"><div class="wrap topbar">
        <a class="brand" href="index.html" aria-label="OficiosSincelejo, inicio">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M9 21l7-11 7 11" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="23" r="2" fill="#fff"/></svg>
          <span>Oficios<b>Sincelejo</b></span></a>
        <nav class="nav">${links.map(([h, t, k]) => `<a href="${h}" ${k === active ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
      </div></header>`);
    document.body.insertAdjacentHTML("beforeend", `<footer><div class="wrap">OficiosSincelejo · Proyecto del curso Espíritu Emprendedor, Ingeniería de Sistemas, CECAR · Sincelejo, Sucre · ${new Date().getFullYear()} · <a href="../index.html">Inicio del proyecto</a></div></footer><div id="toast" class="toast" role="status" hidden></div>`);
  }
  let tt;
  function toast(msg, bad) { const t = $("#toast"); t.textContent = msg; t.classList.toggle("bad", !!bad); t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 3500); }

  /* Suma meses (30 días cada uno) a partir de una fecha AAAA-MM-DD o de hoy. */
  const sumarMeses = (desde, meses) => { const d = new Date(desde + "T12:00:00"); d.setDate(d.getDate() + 30 * meses); return d.toISOString().slice(0, 10); };
  const fechaCorta = ymd => new Date(ymd + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  /* Banner de publicidad de una ferretería o distribuidor. */
  function adCard(a) {
    const img = a.imagen && /^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(a.imagen) ? `<img class="ad-img" src="${esc(a.imagen)}" alt="${esc(a.negocio)}" loading="lazy">` : "";
    const wa = a.whatsapp ? `<a class="btn btn-ghost sm" data-ad="${esc(a.id)}" href="${waUrl(a.whatsapp, "Hola, vi su anuncio en OficiosSincelejo. Quiero más información.")}" target="_blank" rel="noopener">${WA_ICON}Escribir</a>` : "";
    return `<aside class="ad" aria-label="Publicidad">${img}<div class="ad-body"><span class="ad-tag">Publicidad</span><b class="ad-name">${esc(a.negocio)}</b><p class="ad-msg">${esc(a.mensaje)}</p>${wa}</div></aside>`;
  }

  window.UI = { sumarMeses, fechaCorta, adCard, $, $$, esc, safeFotos, cop, avg, dec, fecha, waUrl, normTel, icon, COLORS, WA_ICON, thumbs, starsLine, header, toast };
})();
