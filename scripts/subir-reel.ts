/**
 * Sends a finished reel (MP4 + cover) to Nexopix from this computer:
 *   1. asks /api/media/upload for a token per file and uploads it straight to the blob store (the file never passes
 *      through the Vercel functions, which take about 4.5 MB);
 *   2. creates the piece with POST /api/requests (ready: true): it arrives with its caption, hashtags, day and hour and
 *      waits for approval in the panel.
 * The reference comes from the video's content, so sending the same reel twice never makes a second piece (nor a
 * second upload).
 *
 *   npm run reel -- --video "C:\...\reel.mp4" --portada "C:\...\portada.jpg" --cuenta @curioso_al_dia \
 *     --texto "¿Tu celular te escucha?" --hashtags "tecnologia curiosidades" --fecha 2026-11-20 --hora 19:00
 *
 * Options: --video (required), --portada, --cuenta (required), --objetivo (default: the video's name), --texto or
 * --texto-archivo (a .txt with the caption), --hashtags, --fecha YYYY-MM-DD, --hora HH:MM (Costa Rica),
 * --referencia, --probar (checks everything without uploading or creating anything).
 * Needs NEXOPIX_API_KEY (and optionally NEXOPIX_URL) in the environment or in .env.local.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { put } from "@vercel/blob/client";

type Args = Record<string, string | true>;

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

/** Reads KEY=value lines of .env.local without printing anything. */
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const fail = (message: string): never => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

const CONTENT_TYPES: Record<string, string> = { ".mp4": "video/mp4", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

async function api(base: string, key: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": key, "accept-language": "es", ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body: body as Record<string, unknown> & { error?: { code: string; message: string } } };
}

async function upload(base: string, key: string, file: string) {
  const contentType = CONTENT_TYPES[extname(file).toLowerCase()] ?? fail(`${basename(file)}: solo se suben MP4, JPG o PNG.`);
  const size = statSync(file).size;
  const token = await api(base, key, "/api/media/upload", { method: "POST", body: JSON.stringify({ filename: basename(file), contentType, size }) });
  if (token.status !== 201) fail(`Nexopix no dio permiso para subir ${basename(file)}: ${token.body.error?.message ?? token.status}`);
  const { pathname, clientToken } = token.body as { pathname: string; clientToken: string };
  let last = -1;
  const blob = await put(pathname, readFileSync(file), {
    access: "public",
    token: clientToken,
    contentType,
    multipart: size > 8 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => {
      const step = Math.floor(percentage / 25) * 25;
      if (step !== last) {
        last = step;
        process.stdout.write(`  ${basename(file)}: ${step}%\n`);
      }
    },
  });
  return blob.url;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  const base = (process.env.NEXOPIX_URL || "https://nexopix.vercel.app").replace(/\/$/, "");
  const key = process.env.NEXOPIX_API_KEY || fail("Falta NEXOPIX_API_KEY (en el entorno o en .env.local).");

  const video = typeof args.video === "string" ? resolve(args.video) : fail("Falta --video con la ruta del MP4.");
  if (!existsSync(video) || extname(video).toLowerCase() !== ".mp4") fail(`No encontré el MP4: ${video}`);
  const cover = typeof args.portada === "string" ? resolve(args.portada) : null;
  if (cover && !existsSync(cover)) fail(`No encontré la portada: ${cover}`);
  const account = typeof args.cuenta === "string" ? args.cuenta : fail("Falta --cuenta (por ejemplo @curioso_al_dia).");
  const caption =
    typeof args["texto-archivo"] === "string" ? readFileSync(resolve(args["texto-archivo"]), "utf8").trim() : typeof args.texto === "string" ? args.texto.trim() : fail("Falta --texto o --texto-archivo con el texto del reel.");
  const goal = (typeof args.objetivo === "string" ? args.objetivo : basename(video, extname(video)).replace(/[-_]+/g, " ")).slice(0, 120);
  const reference = typeof args.referencia === "string" ? args.referencia : `reel-${createHash("sha256").update(readFileSync(video)).digest("hex").slice(0, 24)}`;

  // The same reel sent again: nothing is uploaded or created twice.
  const known = await api(base, key, `/api/requests?source=reels&reference=${encodeURIComponent(reference)}`);
  if (known.status === 200) {
    console.log(`✔ Este reel ya estaba en Nexopix: pieza ${known.body.id} (${known.body.status}).`);
    return;
  }
  if (known.status === 401 || known.status === 503) fail(String(known.body.error?.message ?? `Nexopix respondió ${known.status}`));

  if (args.probar) {
    console.log(`✔ Prueba correcta: subiría ${basename(video)}${cover ? ` y ${basename(cover)}` : ""} y crearía la pieza para ${account}.`);
    return;
  }

  console.log("Subiendo archivos…");
  const media = [await upload(base, key, video)];
  if (cover) media.push(await upload(base, key, cover));

  const created = await api(base, key, "/api/requests", {
    method: "POST",
    body: JSON.stringify({
      account,
      network: "instagram",
      format: "reel",
      goal,
      media,
      caption,
      hashtags: typeof args.hashtags === "string" ? args.hashtags : undefined,
      publishOn: typeof args.fecha === "string" ? args.fecha : undefined,
      publishTime: typeof args.hora === "string" ? args.hora : undefined,
      ready: true,
      reference,
      source: "reels",
    }),
  });
  if (created.status !== 201 && created.status !== 200) fail(`Nexopix no aceptó la pieza: ${created.body.error?.message ?? created.status}`);
  console.log(`✔ Pieza ${created.body.id} creada (${created.body.status}). Apruébela en ${base}/panel para que salga a su hora.`);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
