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
| `NEXOPIX_API_KEY` | Habilita `POST /api/peticiones` (encabezado `x-api-key`). |
| `NEXOPIX_PANEL_PASSWORD` | Contraseña del panel. Sin ella el panel queda abierto y no se pueden conectar redes reales. |
| `NEXOPIX_SECRET` | Clave de al menos 32 caracteres: firma la sesión y cifra los permisos de las redes. |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | App de Meta con Instagram Login. Redirección: `https://<dominio>/api/meta/callback`. |

## En el teléfono

El panel se instala como aplicación (PWA): en Android, "Instalar app"; en iPhone, Compartir y "Agregar a inicio".
Abre en `/panel`, a pantalla completa. Pendiente para una app de tienda: la API con inicio de sesión que usarían
la web y la app por igual, y las notificaciones de "Te toca decidir".

```bash
npm test             # reglas del Portero y fechas
npm run db:generate  # migración tras cambiar src/db/schema.ts
```
