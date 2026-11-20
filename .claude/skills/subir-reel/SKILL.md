---
name: subir-reel
description: Manda un reel terminado (MP4 + portada) a Nexopix para que se publique en Instagram tras la aprobación. Úsala cuando el usuario diga "manda el reel X a Nexopix", "sube el reel de hoy", "programa el reel para mañana 7 p. m." o parecido.
---

# Mandar un reel terminado a Nexopix

Los reels animados llegan hechos: un MP4 vertical (1080×1920, 30 fps, H.264/AAC, unos 60 s y 12–22 MB) y su `portada.jpg`, normalmente en la carpeta Descargas del usuario (`%USERPROFILE%\Downloads`). Nexopix los publica en Instagram después de que el usuario los aprueba en el panel.

## Pasos

1. **Encontrar los archivos.** Busca en Descargas el MP4 que el usuario nombró. Si dijo "el de hoy" o "el último", toma el MP4 más reciente. La portada es la `portada*.jpg` más cercana en tiempo o con el mismo nombre base. Si hay un `.txt` o `.md` junto al reel con el texto, úsalo. Si hay dudas entre varios archivos, pregunta antes de subir.
2. **Datos de la publicación.**
   - Cuenta: la que diga el usuario (por defecto `@curioso_al_dia`).
   - Texto (`--texto` o `--texto-archivo`) y hashtags. Si no vienen con el reel, propón un texto corto y hasta 10 hashtags y muéstralos al usuario antes de subir.
   - Fecha y hora en Costa Rica: "mañana 7 p. m." → `--fecha` del día siguiente y `--hora 19:00`. Sin hora, sale a las 10:00.
3. **Probar primero** (no sube nada):
   ```powershell
   npm run reel -- --video "<mp4>" --portada "<jpg>" --cuenta @curioso_al_dia --texto-archivo "<txt>" --hashtags "<tags>" --fecha AAAA-MM-DD --hora HH:MM --probar
   ```
4. **Subir y crear la pieza:** el mismo comando sin `--probar`. El script sube los archivos directo al almacenamiento y crea la pieza **pendiente de aprobación**. Si el reel ya se había mandado, avisa y no lo duplica.
5. **Avisar al usuario:** el número de pieza y que la apruebe en https://nexopix.vercel.app/panel. Al aprobar puede cambiar el día y la hora.

## Reglas
- Nunca imprimas ni copies `NEXOPIX_API_KEY`: el script la lee de `.env.local`.
- No publiques nada sin la aprobación del usuario en el panel: el script solo deja la pieza esperando aprobación.
- Si Nexopix responde con un error, muestra el mensaje tal cual (viene en español) y no reintentes en bucle.
