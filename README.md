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
| `META_APP_SECRET` | Clave secreta de la app de Meta (inicio de sesión unificado de Instagram). El ID de la app y el de la configuración ya vienen en el código; se cambian con `META_APP_ID` y `META_CONFIG_ID`. Redirección: `https://<dominio>/api/meta/callback`. |

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
