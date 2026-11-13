# OficiosSincelejo

Directorio digital de técnicos de oficios varios en Sincelejo (plomería, electricidad, aire acondicionado, pintura, carpintería y más). Los hogares buscan por oficio y barrio, ven fotos de trabajos reales y reseñas, y contactan al técnico directo por WhatsApp. Sin comisión.

Proyecto del curso **Espíritu Emprendedor**, Ingeniería de Sistemas, Corporación Universitaria del Caribe (CECAR), 2026.
Integrantes: José José Arcia Jaramillo, Santiago Bustamante y Steban Castillo. Docente: Germán Nader Abad.

## Contenido del repositorio

| Carpeta | Qué es |
| --- | --- |
| `index.html` | Portada del proyecto con enlaces a las dos versiones |
| `mvp/` | **Versión 1, MVP.** Directorio estático de un solo archivo para validar las hipótesis H1 a H4 |
| `app/` | **Versión 2, funcional.** Directorio, registro de técnicos con fotos, reseñas y panel de administración |
| `app/js/config.js` | Claves de Supabase. Es el único archivo que debes editar |
| `supabase/schema.sql` | Tablas, reglas de seguridad y almacenamiento de fotos |

### Páginas de la versión funcional

- `app/index.html`: directorio público, perfil del técnico, botón de WhatsApp y formulario de reseñas.
- `app/registro.html`: registro del técnico con hasta 6 fotos. El perfil queda **pendiente** hasta que el equipo lo apruebe.
- `app/planes.html`: planes para técnicos (perfil gratis y plan destacado de $10.000 al mes) y publicidad para ferreterías ($50.000 al mes).
- `app/admin.html`: panel del equipo. Sirve para aprobar o rechazar perfiles, marcar la cédula verificada, ocultar reseñas, activar el plan destacado, publicar anuncios, registrar pagos y ver las métricas del MVP y los ingresos.

## Monetización

El hogar usa la plataforma gratis y no se cobra comisión por servicio. Los ingresos vienen de dos fuentes:

1. **Plan destacado** ($10.000 al mes): el técnico aparece de primero en las búsquedas de su oficio, con la etiqueta "Destacado" y la tarjeta resaltada.
2. **Publicidad** ($50.000 al mes): banners de ferreterías y distribuidores entre los resultados del directorio, con botón a su WhatsApp.

El pago se recibe por Nequi, Daviplata, transferencia o efectivo. Desde el panel, el administrador registra el pago y activa el plan por 1 a 12 meses. La pestaña **Ingresos** muestra lo facturado en el mes, el acumulado y el ingreso mensual recurrente. Los precios se pueden cambiar en `config.js` con `PRECIO_DESTACADO` y `PRECIO_PUBLICIDAD`.

Si ya tenías Supabase configurado antes de esta función, corre una vez `supabase/monetizacion.sql` en el SQL Editor.

## Modo demostración

Si `app/js/config.js` no tiene claves, la app arranca en **modo demostración**. Trae 6 técnicos ficticios y todo funciona en el navegador: registro, aprobación, reseñas y métricas. Los datos se guardan solo en ese navegador. La contraseña del panel en este modo es `admin123`.

## Publicar en GitHub Pages (link público)

1. Crea un repositorio en GitHub, por ejemplo `oficiossincelejo`, y sube **el contenido** de esta carpeta (no la carpeta). En la raíz del repo deben quedar `index.html`, `app/`, `mvp/` y `supabase/`.
   - Desde la web: **Add file > Upload files**, arrastra los archivos y carpetas, y pulsa **Commit changes**.
2. Entra a **Settings > Pages**.
3. En **Build and deployment**, elige **Source: Deploy from a branch**, la rama **main** y la carpeta **/ (root)**. Pulsa **Save**.
4. Espera 1 o 2 minutos. El link queda así: `https://TU-USUARIO.github.io/oficiossincelejo/`
   - MVP: `https://TU-USUARIO.github.io/oficiossincelejo/mvp/`
   - Plataforma: `https://TU-USUARIO.github.io/oficiossincelejo/app/`

Hasta aquí la app ya funciona, en modo demostración.

## Conectar Supabase (datos reales compartidos)

1. Crea una cuenta gratis en https://supabase.com y luego un proyecto nuevo (región: East US o South America). Guarda la contraseña de la base de datos.
2. Abre **SQL Editor > New query**, pega todo el contenido de `supabase/schema.sql` y pulsa **Run**. Debe responder *Success*.
3. Crea la cuenta del administrador en **Authentication > Users > Add user > Create new user**. Pon un correo y una contraseña, y marca *Auto Confirm User*.
4. **Importante:** en **Authentication > Sign In / Providers**, desactiva **Allow new users to sign up**. Así nadie más puede crear una cuenta con permisos de administrador.
5. En **Project Settings > API** copia el **Project URL** y la clave **anon public** (en proyectos nuevos se llama *publishable key*).
6. Pégalos en `app/js/config.js`:
   ```js
   SUPABASE_URL: "https://xxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi...",
   ```
7. Sube el archivo cambiado al repositorio. En un minuto la página publicada guarda los datos en Supabase y desaparece el aviso de modo demostración.

> La clave *anon* es pública por diseño. La protección la dan las reglas RLS de `schema.sql`: los visitantes solo ven técnicos aprobados, solo pueden registrar perfiles como *pendiente* y no pueden editar nada. **Nunca** pongas la clave `service_role` en el código.

## Seguridad y datos personales

- Cada técnico acepta la autorización de datos (Ley 1581 de 2012) antes de enviar su perfil.
- Los perfiles nuevos no se publican hasta que el equipo los revisa.
- Las fotos se reducen a 1200 px antes de subirlas, y solo se aceptan imágenes de hasta 5 MB.
- Todo el texto que escriben los usuarios se escapa antes de mostrarse, para evitar inyección de código.

## Tecnologías

HTML, CSS y JavaScript sin frameworks · Supabase (PostgreSQL, Auth y Storage) · GitHub Pages.
