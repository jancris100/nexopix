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
| `DATABASE_URL` | Base en Neon. Prepárala una vez con `npm run db:setup`. |
| `NEXOPIX_API_KEY` | Habilita `POST /api/peticiones` (encabezado `x-api-key`). |

```bash
npm test             # reglas del Portero y fechas
npm run db:generate  # migración tras cambiar src/db/schema.ts
```
