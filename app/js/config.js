/* =====================================================================
   CONFIGURACIÓN DE OFICIOSSINCELEJO
   ---------------------------------------------------------------------
   1. Crea un proyecto gratis en https://supabase.com
   2. Ve a Project Settings > API y copia "Project URL" y la clave "anon public".
   3. Pégalas abajo, guarda el archivo y súbelo al repositorio.

   Si dejas SUPABASE_URL vacío, la app funciona en MODO DEMOSTRACIÓN:
   los datos se guardan solo en el navegador de quien la usa.
   La clave "anon public" es pública por diseño. La seguridad la dan
   las políticas RLS de supabase/schema.sql. NUNCA pegues aquí la
   clave "service_role".
   ===================================================================== */
window.OS_CONFIG = {
  SUPABASE_URL: "",        // ej: "https://abcdxyz.supabase.co"
  SUPABASE_ANON_KEY: "sb_publishable_lCSiBHkdQrdfS4rrZXDMJw_cxmFA4OB",   // ej: "eyJhbGciOi..."

  // WhatsApp del equipo para soporte (formato 57 + celular, sin + ni espacios). Opcional.
  WHATSAPP_EQUIPO: "",

  // Contraseña del panel de administración SOLO en modo demostración.
  DEMO_ADMIN_PASSWORD: "admin123",
};
