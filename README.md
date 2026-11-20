# Nexopix

Middleware de agentes de IA para Instagram y Facebook, conectado por API, con aprobación humana.

Proyecto del track AI Operators de Dojo AI Hackathon (20 al 22 de noviembre de 2026).

## Estado al iniciar el hackathon

Antes del 20 de noviembre existen la página pública, el panel con datos de prueba, la base de datos y las reglas fijas
del Portero. **No hay agentes de IA reales, ni conexión con Meta, ni publicaciones**: los agentes del panel son
interruptores sin lógica. La etiqueta `inicio-hackathon` marca ese punto de partida.

## Desarrollo

```bash
npm install
npm run dev
```

Sin `DATABASE_URL` el panel usa un Postgres embebido (`.data/`) con datos de prueba.

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Base en Neon. Las migraciones se aplican solas en cada despliegue. |
| `NEXOPIX_API_KEY` | Habilita la API para otros sistemas (encabezado `x-api-key`): `GET /api/accounts`, `POST /api/requests`, `GET /api/requests/{id}` y `GET /api/requests?source=&reference=`. La API siempre está en inglés; los mensajes de error salen en español con `accept-language: es`. Documentación completa en `/docs`. |
| `NEXOPIX_PANEL_PASSWORD` | Contraseña del panel. Sin ella el panel queda abierto y no se pueden conectar redes reales. |
| `NEXOPIX_SECRET` | Clave de al menos 32 caracteres: firma la sesión y cifra los permisos de las redes. |
| `CRON_SECRET` | Activa `GET /api/cron/publish` (encabezado `Authorization: Bearer <CRON_SECRET>`): el Programador publica en Instagram las piezas aprobadas cuya hora llegó. Vercel Cron lo llama una vez al día (`vercel.json`); para publicar a la hora exacta, la acción de GitHub `.github/workflows/publish.yml` lo llama cada 10 minutos con el secreto del repositorio `NEXOPIX_CRON_SECRET` (mismo valor). |
| `META_APP_SECRET` | Clave secreta de la app de Meta (inicio de sesión unificado de Instagram). El ID de la app y el de la configuración ya vienen en el código; se cambian con `META_APP_ID` y `META_CONFIG_ID`. Redirección: `https://<dominio>/api/meta/callback`. |
| `BLOB_READ_WRITE_TOKEN` | Almacenamiento de Vercel Blob (lo crea Vercel al conectar un Blob store al proyecto). Habilita `POST /api/media/upload`, que entrega un permiso de 30 minutos para subir un MP4 o una imagen directo al almacenamiento. El archivo no pasa por las funciones, que aceptan unos 4.5 MB. Lo subido se borra a los **7 días**: el Programador (`/api/cron/publish`) elimina los archivos de `media/` con más de 7 días, salvo los de piezas que todavía no se publicaron. Una vez publicado, Instagram guarda su propia copia. |

## Reels terminados

Un reel hecho afuera (MP4 vertical y su portada) entra listo para aprobar:

```powershell
npm run reel -- --video "<reel.mp4>" --portada "<portada.jpg>" --cuenta @curioso_al_dia --texto "…" --hashtags "…" --fecha 2026-11-20 --hora 19:00
```

El script (`scripts/subir-reel.ts`) hace dos cosas:
1. Sube los archivos con `POST /api/media/upload`.
2. Crea la pieza con `POST /api/requests` y `ready: true`. La pieza llega con el texto, los hashtags y la hora, y queda pendiente de aprobación.

Al publicarla, la imagen va como portada del reel (`cover_url`). Lee `NEXOPIX_API_KEY` de `.env.local`, y `--probar` verifica todo sin subir nada. En Claude Code, la habilidad `subir-reel` lo hace a partir de "manda el reel X para mañana 7 p. m.".

## En el teléfono

El panel se instala como aplicación (PWA): en Android, "Instalar app"; en iPhone, Compartir y "Agregar a inicio".
Abre en `/panel`, a pantalla completa. Pendiente para una app de tienda: la API con inicio de sesión que usarían
la web y la app por igual, y las notificaciones de "Te toca decidir".

```bash
npm test             # reglas del Portero y fechas
npm run db:generate  # migración tras cambiar src/db/schema.ts
```

## Idiomas

La interfaz está en inglés y en español (selector EN/ES, guardado en la cookie `np_lang`). Los textos viven en `src/i18n/dictionaries.ts` y la documentación de la API en `src/app/docs/content.ts`; una prueba revisa que los dos idiomas tengan las mismas claves. Todo código, campo y estado interno va en inglés.
