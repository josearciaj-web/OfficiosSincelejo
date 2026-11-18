/* Capa de datos de OficiosSincelejo.
   Usa Supabase si config.js tiene las claves; si no, usa el navegador (modo demostración).
   Todas las funciones devuelven promesas con la misma forma en los dos modos. */
(function () {
  const CFG = window.OS_CONFIG || {};

  const OFICIOS = {
    plomeria: "Plomería",
    electricidad: "Electricidad",
    aire: "Aire acondicionado",
    pintura: "Pintura",
    carpinteria: "Carpintería",
    cerrajeria: "Cerrajería",
    refrigeracion: "Neveras y lavadoras",
    construccion: "Albañilería",
  };
  const BARRIOS = ["Centro", "Boston", "El Bosque", "La Ford", "Las Américas", "Majagual", "Mochila",
    "San Carlos", "Uribe Uribe", "Venecia", "Villa Orieta", "La Selva", "Las Margaritas", "La Gallera",
    "Pioneros", "Altos del Rosario", "Toda la ciudad"];

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const now = () => new Date().toISOString();
  /* Fecha de hoy en Colombia (AAAA-MM-DD). */
  const hoy = () => new Date(Date.now() - 5 * 36e5).toISOString().slice(0, 10);

  /* Reduce una imagen antes de subirla: máx. 1200 px de lado, JPEG. */
  function resizeImage(file, max = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error("El archivo " + file.name + " no es una imagen."));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? resolve(b) : reject(new Error("No se pudo procesar " + file.name)), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer " + file.name)); };
      img.src = url;
    });
  }
  const blobToDataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });

  /* ------------------------------------------------------------------ */
  /*  MODO SUPABASE                                                      */
  /* ------------------------------------------------------------------ */
  function supabaseStore() {
    const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

    return {
      mode: "supabase",
      async listTecnicos() {
        const rows = ok(await sb.from("tecnicos").select("*, resenas(estrellas, estado)").eq("estado", "aprobado"));
        return rows.map(t => ({ ...t, resenas: (t.resenas || []).filter(r => r.estado === "publicada") }));
      },
      async getResenas(tecnicoId) {
        return ok(await sb.from("resenas").select("*").eq("tecnico_id", tecnicoId).eq("estado", "publicada").order("created_at", { ascending: false }));
      },
      async crearTecnico(data, files) {
        const fotos = [];
        for (const f of files) {
          const blob = await resizeImage(f);
          const path = `tecnicos/${uid()}.jpg`;
          ok(await sb.storage.from("fotos").upload(path, blob, { contentType: "image/jpeg", upsert: false }));
          fotos.push(sb.storage.from("fotos").getPublicUrl(path).data.publicUrl);
        }
        ok(await sb.from("tecnicos").insert({ ...data, fotos, estado: "pendiente", verificado: false }));
      },
      async crearResena(r) { ok(await sb.from("resenas").insert({ ...r, estado: "publicada" })); },
      async registrarContacto(tecnicoId, barrio) {
        try { await sb.from("contactos").insert({ tecnico_id: tecnicoId, barrio: barrio || null }); } catch (e) { /* no bloquea el contacto */ }
      },
      // ---- administración ----
      async login(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); },
      async logout() { await sb.auth.signOut(); },
      async session() { const { data } = await sb.auth.getSession(); return data.session ? { email: data.session.user.email } : null; },
      async adminTecnicos() { return ok(await sb.from("tecnicos").select("*").order("created_at", { ascending: false })); },
      async updateTecnico(id, patch) { ok(await sb.from("tecnicos").update(patch).eq("id", id)); },
      async deleteTecnico(id) { ok(await sb.from("tecnicos").delete().eq("id", id)); },
      async adminResenas() { return ok(await sb.from("resenas").select("*, tecnicos(nombre)").order("created_at", { ascending: false })); },
      async updateResena(id, patch) { ok(await sb.from("resenas").update(patch).eq("id", id)); },
      async adminContactos() { return ok(await sb.from("contactos").select("*").order("created_at", { ascending: false }).limit(5000)); },
      // ---- monetización ----
      async listAnuncios() {
        return ok(await sb.from("anuncios").select("*").eq("activo", true).gte("hasta", hoy()));
      },
      async adminAnuncios() { return ok(await sb.from("anuncios").select("*").order("created_at", { ascending: false })); },
      async crearAnuncio(data, file) {
        let imagen = null;
        if (file) {
          const blob = await resizeImage(file, 1200, 0.82);
          const path = `anuncios/${uid()}.jpg`;
          ok(await sb.storage.from("fotos").upload(path, blob, { contentType: "image/jpeg", upsert: false }));
          imagen = sb.storage.from("fotos").getPublicUrl(path).data.publicUrl;
        }
        return ok(await sb.from("anuncios").insert({ ...data, imagen }).select().single());
      },
      async updateAnuncio(id, patch) { ok(await sb.from("anuncios").update(patch).eq("id", id)); },
      async deleteAnuncio(id) { ok(await sb.from("anuncios").delete().eq("id", id)); },
      async adminPagos() { return ok(await sb.from("pagos").select("*").order("created_at", { ascending: false }).limit(2000)); },
      async registrarPago(p) { ok(await sb.from("pagos").insert(p)); },
      async adminPiloto() { return ok(await sb.from("piloto").select("*").order("created_at", { ascending: false }).limit(5000)); },
      async addPiloto(r) { ok(await sb.from("piloto").insert(r)); },
      async deletePiloto(id) { ok(await sb.from("piloto").delete().eq("id", id)); },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  MODO DEMOSTRACIÓN (navegador)                                      */
  /* ------------------------------------------------------------------ */
  function localStore() {
    const KEY = "oficiossincelejo-demo-v2";
    let mem = null;
    const days = n => new Date(Date.now() - n * 864e5).toISOString();

    function seed() {
      const T = (id, nombre, oficio, barrios, anios, tarifa, verificado, descripcion, wa) =>
        ({ id, created_at: days(30), nombre, oficio, barrios, anios, tarifa, verificado, descripcion, whatsapp: wa, fotos: [], estado: "aprobado", consentimiento: true });
      const tecnicos = [
        T("d1", "Rafael Mercado", "plomeria", ["Centro", "La Ford", "Majagual"], 12, 30000, true, "Fugas, cambio de tubería, instalación de tanques y sanitarios.", "573000000001"),
        T("d2", "Yeimis Pérez", "electricidad", ["Boston", "Venecia", "El Bosque"], 8, 35000, true, "Tableros, tomas 220 V, cortos y cableado de viviendas.", "573000000002"),
        T("d3", "Luis Fernando Arrieta", "aire", ["Las Américas", "Villa Orieta", "La Selva", "Centro"], 6, 40000, true, "Mantenimiento e instalación de minisplit y aires de ventana.", "573000000003"),
        T("d4", "Edwin Salgado", "pintura", ["Mochila", "San Carlos", "Uribe Uribe"], 15, 25000, false, "Pintura de fachadas e interiores, estuco e impermeabilización.", "573000000004"),
        T("d5", "Hernando Tovar", "carpinteria", ["Centro", "Boston", "La Ford"], 20, 30000, true, "Puertas, closets en melamina, chapas y bisagras.", "573000000005"),
        T("d6", "Kevin Montes", "aire", ["Majagual", "El Bosque", "Venecia"], 4, 35000, true, "Limpieza de evaporador, capacitores y carga de gas.", "573000000006"),
      ];
      tecnicos.push({ ...T("d7", "Jorge Luis Benítez", "electricidad", ["Pioneros", "La Gallera"], 3, 30000, false, "Instalaciones eléctricas residenciales.", "573000000007"), estado: "pendiente", created_at: days(1) });
      const R = (tid, autor, estrellas, texto, d) => ({ id: uid(), tecnico_id: tid, autor, estrellas, texto, estado: "publicada", created_at: days(d) });
      const resenas = [
        R("d1", "María José R.", 5, "Llegó el mismo día y explicó el daño antes de cobrar.", 6),
        R("d1", "Carlos A. Díaz", 4, "Buen trabajo, se demoró un poco en conseguir el repuesto.", 20),
        R("d2", "Diana Martínez", 5, "Revisó toda la instalación y dejó todo marcado.", 9),
        R("d3", "Andrés Vergara", 5, "Dejó el aire limpio y enfriando como nuevo.", 3),
        R("d3", "Paola Ruiz", 5, "Puntual y con precio claro desde el inicio.", 12),
        R("d3", "Jhon Jairo C.", 4, "Bien, aunque pidió pago adelantado del repuesto.", 25),
        R("d4", "Liliana Ortega", 4, "Acabado limpio, cubrió bien los muebles.", 15),
        R("d6", "Ricardo Sierra", 4, "Resolvió el ruido del aire en una visita.", 8),
      ];
      const contactos = [];
      const ids = ["d1", "d2", "d3", "d3", "d4", "d5", "d6", "d1", "d3", "d2"];
      for (let i = 0; i < 34; i++) contactos.push({ id: uid(), tecnico_id: ids[i % ids.length], barrio: BARRIOS[i % 12], created_at: days(i % 14) });
      // Plan destacado vigente para dos técnicos
      const fut = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
      tecnicos.find(t => t.id === "d3").destacado_hasta = fut(22);
      tecnicos.find(t => t.id === "d1").destacado_hasta = fut(9);
      const anuncios = [
        { id: "a1", created_at: days(10), negocio: "Ferretería El Tornillo", mensaje: "Tubería, cables y pintura con 10 % de descuento para técnicos de OficiosSincelejo.", whatsapp: "573000000101", imagen: null, activo: true, hasta: fut(20) },
        { id: "a2", created_at: days(4), negocio: "Distribuidora Sabanas", mensaje: "Repuestos para aire acondicionado y neveras. Entrega el mismo día en Sincelejo.", whatsapp: "573000000102", imagen: null, activo: true, hasta: fut(26) },
      ];
      const P = (tipo, referencia, concepto, valor, medio, meses, d) => ({ id: uid(), created_at: days(d), tipo, referencia, concepto, valor, medio, meses });
      const pagos = [
        P("destacado", "d3", "Plan destacado · Luis Fernando Arrieta", 10000, "Nequi", 1, 8),
        P("destacado", "d1", "Plan destacado · Rafael Mercado", 10000, "Daviplata", 1, 21),
        P("publicidad", "a1", "Publicidad · Ferretería El Tornillo", 50000, "Transferencia", 1, 10),
        P("publicidad", "a2", "Publicidad · Distribuidora Sabanas", 50000, "Nequi", 1, 4),
      ];
      return { tecnicos, resenas, contactos, anuncios, pagos, session: null };
    }
    function load() {
      if (mem) return mem;
      try { mem = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { mem = null; }
      if (!mem) { mem = seed(); save(); }
      return mem;
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(mem)); }
      catch (e) { throw new Error("El navegador no tiene espacio para guardar más fotos en modo demostración. Usa menos fotos o configura Supabase."); }
    }
    const wait = v => new Promise(r => setTimeout(() => r(v), 120));
    const needAdmin = () => { if (!load().session) throw new Error("Inicia sesión como administrador."); };

    return {
      mode: "demo",
      async listTecnicos() {
        const d = load();
        return wait(d.tecnicos.filter(t => t.estado === "aprobado")
          .map(t => ({ ...t, resenas: d.resenas.filter(r => r.tecnico_id === t.id && r.estado === "publicada") })));
      },
      async getResenas(id) {
        return wait(load().resenas.filter(r => r.tecnico_id === id && r.estado === "publicada").sort((a, b) => b.created_at.localeCompare(a.created_at)));
      },
      async crearTecnico(data, files) {
        const fotos = [];
        for (const f of files) fotos.push(await blobToDataURL(await resizeImage(f, 800, 0.7)));
        const d = load();
        d.tecnicos.push({ ...data, id: uid(), created_at: now(), fotos, estado: "pendiente", verificado: false });
        save(); return wait();
      },
      async crearResena(r) { const d = load(); d.resenas.push({ ...r, id: uid(), estado: "publicada", created_at: now() }); save(); return wait(); },
      async registrarContacto(id, barrio) { const d = load(); d.contactos.push({ id: uid(), tecnico_id: id, barrio: barrio || null, created_at: now() }); try { save(); } catch (e) {} },
      async login(email, password) {
        if (password !== (CFG.DEMO_ADMIN_PASSWORD || "admin123")) throw new Error("Contraseña incorrecta.");
        load().session = { email: email || "admin@demo" }; save(); return wait();
      },
      async logout() { load().session = null; save(); },
      async session() { return load().session; },
      async adminTecnicos() { needAdmin(); return wait([...load().tecnicos].sort((a, b) => b.created_at.localeCompare(a.created_at))); },
      async updateTecnico(id, patch) { needAdmin(); const t = load().tecnicos.find(x => x.id === id); Object.assign(t, patch); save(); return wait(); },
      async deleteTecnico(id) { needAdmin(); const d = load(); d.tecnicos = d.tecnicos.filter(x => x.id !== id); d.resenas = d.resenas.filter(r => r.tecnico_id !== id); save(); return wait(); },
      async adminResenas() {
        needAdmin(); const d = load();
        return wait(d.resenas.map(r => ({ ...r, tecnicos: { nombre: (d.tecnicos.find(t => t.id === r.tecnico_id) || {}).nombre || "—" } }))
          .sort((a, b) => b.created_at.localeCompare(a.created_at)));
      },
      async updateResena(id, patch) { needAdmin(); Object.assign(load().resenas.find(x => x.id === id), patch); save(); return wait(); },
      async adminContactos() { needAdmin(); return wait([...load().contactos]); },
      // ---- monetización ----
      async listAnuncios() { return wait((load().anuncios || []).filter(a => a.activo && a.hasta >= hoy())); },
      async adminAnuncios() { needAdmin(); return wait([...(load().anuncios || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))); },
      async crearAnuncio(data, file) {
        needAdmin();
        const imagen = file ? await blobToDataURL(await resizeImage(file, 900, 0.75)) : null;
        const a = { ...data, imagen, id: uid(), created_at: now() };
        const d = load(); (d.anuncios = d.anuncios || []).push(a); save(); return wait(a);
      },
      async updateAnuncio(id, patch) { needAdmin(); Object.assign(load().anuncios.find(x => x.id === id), patch); save(); return wait(); },
      async deleteAnuncio(id) { needAdmin(); const d = load(); d.anuncios = d.anuncios.filter(x => x.id !== id); save(); return wait(); },
      async adminPagos() { needAdmin(); return wait([...(load().pagos || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))); },
      async registrarPago(p) { needAdmin(); const d = load(); (d.pagos = d.pagos || []).push({ ...p, id: uid(), created_at: now() }); save(); return wait(); },
      async adminPiloto() { needAdmin(); return wait([...(load().piloto || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))); },
      async addPiloto(r) { needAdmin(); const d = load(); (d.piloto = d.piloto || []).push({ ...r, id: uid(), created_at: now() }); save(); return wait(); },
      async deletePiloto(id) { needAdmin(); const d = load(); d.piloto = (d.piloto || []).filter(x => x.id !== id); save(); return wait(); },
      resetDemo() { try { localStorage.removeItem(KEY); } catch (e) {} mem = null; },
    };
  }

  const useSupabase = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  let store;
  if (useSupabase && window.supabase && window.supabase.createClient) store = supabaseStore();
  else store = localStore();
  store.configError = useSupabase && !(window.supabase && window.supabase.createClient)
    ? "No se pudo cargar la librería de Supabase. Revisa tu conexión a internet." : null;

  /* Precios de los planes (COP por mes). Se pueden cambiar desde config.js. */
  const PRECIOS = { destacado: CFG.PRECIO_DESTACADO || 10000, publicidad: CFG.PRECIO_PUBLICIDAD || 50000 };
  const MEDIOS = ["Nequi", "Daviplata", "Transferencia", "Efectivo"];
  const esDestacado = t => !!(t && t.destacado_hasta && t.destacado_hasta >= hoy());

  window.OS = { store, OFICIOS, BARRIOS, CFG, PRECIOS, MEDIOS, esDestacado, hoy };
})();
