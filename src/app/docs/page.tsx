import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../../components/panel/Marks";
import CopyButton from "./CopyButton";
import "./docs.css";

export const metadata: Metadata = {
  title: "API de Nexopix",
  description: "Cómo otro sistema pide contenido a Nexopix y sigue cada petición hasta que se publica.",
};

const BASE = "https://nexopix.vercel.app";

const SECTIONS = [
  { id: "inicio", label: "Qué es la API" },
  { id: "antes", label: "Antes de empezar" },
  { id: "recorrido", label: "Recorrido de una petición" },
  { id: "cuentas", label: "Ver las cuentas" },
  { id: "peticiones", label: "Enviar una petición" },
  { id: "estado", label: "Consultar el estado" },
  { id: "formatos", label: "Formatos y redes" },
  { id: "errores", label: "Errores" },
  { id: "practicas", label: "Buenas prácticas" },
  { id: "ejemplos", label: "Ejemplo completo" },
  { id: "preguntas", label: "Preguntas frecuentes" },
];

type Field = { name: string; type: string; required?: boolean; rule: ReactNode; example: string };

const REQUEST_FIELDS: Field[] = [
  { name: "cuenta", type: "texto", required: true, rule: <>El <code>id</code> o el nombre (<code>@marca</code>) de una cuenta que devuelve <a href="#cuentas">Ver las cuentas</a>.</>, example: '"@intenexo.cr"' },
  { name: "red", type: "texto", required: true, rule: <><code>instagram</code>, <code>facebook</code> o <code>tiktok</code>. Debe ser la misma red de la cuenta.</>, example: '"instagram"' },
  { name: "formato", type: "texto", required: true, rule: <>Uno de los formatos que admite esa red. Ver <a href="#formatos">Formatos y redes</a>.</>, example: '"carrusel"' },
  { name: "objetivo", type: "texto", required: true, rule: "Qué se quiere lograr con la publicación, en una frase. De 3 a 120 caracteres.", example: '"Promo de diciembre del exprimidor"' },
  { name: "referencia", type: "texto", rule: <>El número o código que <b>su sistema</b> le da a esta petición. Si la envía dos veces, Nexopix no crea una segunda pieza. Hasta 120 caracteres: letras, números y <code>. : _ -</code></>, example: '"intenexo:empresa-12:4581"' },
  { name: "origen", type: "texto", rule: <>Quién envía. Letras minúsculas, números y guiones, hasta 40. Si manda <code>referencia</code> sin <code>origen</code>, se usa <code>api</code>.</>, example: '"intenexo"' },
  { name: "producto", type: "objeto", rule: <>El producto del que trata la publicación. Ver la tabla <a href="#producto">Producto</a>.</>, example: "{ … }" },
  { name: "media", type: "lista de textos", rule: "Imágenes o videos para usar, como direcciones https públicas. Hasta 10. Si no manda ninguna, se usan las imágenes del producto.", example: '["https://…/1.jpg"]' },
  { name: "fecha", type: "texto", rule: "Día en que quiere que salga, con la forma AAAA-MM-DD, hora de Costa Rica. No puede ser un día que ya pasó. La petición aparece ese día en la semana del panel.", example: '"2026-11-20"' },
  { name: "notas", type: "texto", rule: "Indicaciones para el equipo: tono, descuento, qué evitar. Hasta 500 caracteres.", example: '"15% de descuento"' },
  { name: "modo", type: "texto", rule: <><code>api</code> (Nexopix publica) o <code>manual</code> (queda como tarea para una persona). Si no lo manda, es <code>api</code>. TikTok siempre es <code>manual</code>.</>, example: '"api"' },
];

const PRODUCT_FIELDS: Field[] = [
  { name: "nombre", type: "texto", required: true, rule: "De 2 a 150 caracteres.", example: '"Exprimidor eléctrico"' },
  { name: "precio", type: "número", rule: "Cero o mayor, sin símbolo de moneda ni separadores de miles.", example: "12500" },
  { name: "moneda", type: "texto", rule: <>Código de 3 letras mayúsculas: <code>CRC</code>, <code>USD</code>…</>, example: '"CRC"' },
  { name: "descripcion", type: "texto", rule: "Hasta 1000 caracteres.", example: '"Jugo en 10 segundos…"' },
  { name: "enlace", type: "texto", rule: "Dirección https de la página del producto. Los enlaces que publique el equipo apuntan aquí.", example: '"https://tienda.cr/p/exprimidor"' },
  { name: "imagenes", type: "lista de textos", rule: "Hasta 10 direcciones https públicas.", example: '["https://…/a.jpg"]' },
];

const STATES = [
  { code: "recibida", name: "Recibida", who: "Portero", text: "Pasó las reglas y quedó guardada. Entra al equipo." },
  { code: "en_produccion", name: "En producción", who: "Guionista", text: "El equipo escribe el texto y prepara las imágenes o el video." },
  { code: "por_aprobar", name: "Por aprobar", who: "Una persona", text: "Espera que alguien la apruebe en el panel. Si la rechaza, vuelve a producción.", human: true },
  { code: "programada", name: "Programada", who: "Programador", text: "Aprobada y con día y hora para salir." },
  { code: "publicada", name: "Publicada", who: "Analista", text: "Ya está en la red. El campo enlace trae la dirección de la publicación." },
];

const FORMATS = [
  { code: "reel", name: "Reel", networks: "Instagram, Facebook, TikTok", media: "Un video." },
  { code: "publicacion", name: "Publicación", networks: "Instagram, Facebook", media: "Una imagen." },
  { code: "carrusel", name: "Carrusel", networks: "Instagram, Facebook", media: "De 2 a 10 imágenes, obligatorias (en media o en producto.imagenes)." },
  { code: "historia", name: "Historia", networks: "Instagram, Facebook", media: "Una imagen o un video vertical." },
  { code: "anuncio", name: "Meta Ads", networks: "Instagram, Facebook", media: "Imagen o video para un anuncio pagado." },
];

const ERRORS = [
  { code: "200", name: "Ya existía", meaning: "Envió una referencia que ya había enviado. Devuelve la misma pieza con repetida: true.", action: "Nada. Use el id que recibe." },
  { code: "201", name: "Creada", meaning: "La petición pasó las reglas y es una pieza nueva.", action: "Guarde el id para consultar el estado." },
  { code: "400", name: "Cuerpo inválido", meaning: "Lo que llegó no es JSON, o falta un dato de la consulta.", action: "Revise el encabezado content-type y el cuerpo." },
  { code: "401", name: "Clave no válida", meaning: "Falta el encabezado x-api-key o la clave no coincide.", action: "Revise la clave. No reintente: fallará igual." },
  { code: "404", name: "No existe", meaning: "No hay una petición con ese id o esa referencia.", action: "Revise el número, el origen y la referencia." },
  { code: "422", name: "No pasó las reglas", meaning: "El campo error dice exactamente qué regla no se cumplió.", action: "Muestre el mensaje a la persona y corrija. No reintente igual." },
  { code: "503", name: "API apagada", meaning: "El servidor no tiene la clave de la API configurada.", action: "Avise al administrador de Nexopix." },
  { code: "5xx", name: "Falla temporal", meaning: "Algo falló del lado de Nexopix o de la red.", action: "Reintente con la misma referencia: no se duplica." },
];

const RULES = [
  ["Escribe qué quieres publicar.", "objetivo vacío o de menos de 3 caracteres."],
  ["El objetivo admite 120 caracteres.", "objetivo demasiado largo."],
  ["Esa cuenta no está registrada.", "cuenta no coincide con ningún id ni nombre."],
  ["Esa red no está disponible.", "red no es instagram, facebook ni tiktok."],
  ["@marca no es una cuenta de instagram.", "la cuenta existe, pero es de otra red."],
  ["instagram no admite el formato X.", "el formato no existe o esa red no lo admite."],
  ["Se admiten hasta 10 archivos.", "media trae más de 10 elementos o no es una lista."],
  ["Cada archivo debe ser una dirección https pública.", "algún elemento de media no empieza con https://."],
  ["Un carrusel necesita de 2 a 10 imágenes.", "carrusel con menos de 2 imágenes entre media y producto.imagenes."],
  ["El producto necesita un nombre de 2 a 150 caracteres.", "producto sin nombre válido."],
  ["El precio debe ser un número positivo.", "precio negativo o escrito como texto."],
  ["La moneda debe ser un código de 3 letras, como CRC o USD.", "moneda distinta de tres mayúsculas."],
  ["La fecha debe tener la forma AAAA-MM-DD.", "fecha con otra forma."],
  ["La fecha deseada ya pasó.", "fecha anterior a hoy en Costa Rica."],
  ["La referencia admite letras, números y . : _ - hasta 120 caracteres.", "referencia con espacios u otros símbolos."],
  ["Las notas admiten 500 caracteres.", "notas demasiado largas."],
];

const CURL_ACCOUNTS = `curl ${BASE}/api/cuentas \\
  -H "x-api-key: SU_CLAVE"`;

const ACCOUNTS_RESPONSE = `{
  "cuentas": [
    {
      "id": "ig-17841400000000000",
      "cuenta": "@intenexo.cr",
      "red": "instagram",
      "marca": "INTENEXO",
      "conectada": true,
      "formatos": ["reel", "publicacion", "carrusel", "historia", "anuncio"]
    }
  ]
}`;

const REQUEST_BODY = `{
  "cuenta": "@intenexo.cr",
  "red": "instagram",
  "formato": "carrusel",
  "objetivo": "Promo de diciembre del exprimidor",
  "origen": "intenexo",
  "referencia": "intenexo:empresa-12:4581",
  "producto": {
    "nombre": "Exprimidor eléctrico",
    "precio": 12500,
    "moneda": "CRC",
    "descripcion": "Jugo natural en 10 segundos.",
    "enlace": "https://tienda.cr/p/exprimidor",
    "imagenes": [
      "https://tienda.cr/img/exprimidor-1.jpg",
      "https://tienda.cr/img/exprimidor-2.jpg"
    ]
  },
  "fecha": "2026-11-20",
  "notas": "15% de descuento hasta el 31 de diciembre"
}`;

const CURL_REQUEST = `curl ${BASE}/api/peticiones \\
  -H "x-api-key: SU_CLAVE" \\
  -H "content-type: application/json" \\
  -d '{
    "cuenta": "@intenexo.cr",
    "red": "instagram",
    "formato": "publicacion",
    "objetivo": "Promo de diciembre del exprimidor",
    "origen": "intenexo",
    "referencia": "intenexo:empresa-12:4581"
  }'`;

const CREATED = `{
  "id": 34,
  "estado": "recibida",
  "manual": false,
  "repetida": false
}`;

const REJECTED = `{
  "error": "Un carrusel necesita de 2 a 10 imágenes."
}`;

const CURL_STATUS = `curl ${BASE}/api/peticiones/34 \\
  -H "x-api-key: SU_CLAVE"

# o con la referencia de su sistema:
curl "${BASE}/api/peticiones?origen=intenexo&referencia=intenexo:empresa-12:4581" \\
  -H "x-api-key: SU_CLAVE"`;

const STATUS_RESPONSE = `{
  "id": 34,
  "estado": "publicada",
  "objetivo": "Promo de diciembre del exprimidor",
  "formato": "carrusel",
  "cuenta": "@intenexo.cr",
  "red": "instagram",
  "origen": "intenexo",
  "referencia": "intenexo:empresa-12:4581",
  "enlace": "https://www.instagram.com/p/C0abc123/",
  "recibida": "2026-11-08T22:20:56.905Z"
}`;

const JS_EXAMPLE = `// En el servidor (Node 18 o más reciente). Nunca en el navegador.
const BASE = "${BASE}";
const headers = {
  "x-api-key": process.env.NEXOPIX_API_KEY,
  "content-type": "application/json",
};

export async function pedirContenido(solicitud) {
  const respuesta = await fetch(\`\${BASE}/api/peticiones\`, {
    method: "POST",
    headers,
    body: JSON.stringify(solicitud),
  });
  const datos = await respuesta.json();
  if (respuesta.status === 422) throw new Error(datos.error); // regla no cumplida: mostrar a la persona
  if (!respuesta.ok) throw new Error(\`Nexopix respondió \${respuesta.status}\`);
  return datos; // { id, estado, manual, repetida }
}

export async function consultarEstado(id) {
  const respuesta = await fetch(\`\${BASE}/api/peticiones/\${id}\`, { headers });
  return respuesta.ok ? respuesta.json() : null;
}`;

const CSHARP_EXAMPLE = `// .NET 8 o más reciente. La clave sale de la configuración, nunca del código.
using System.Net;
using System.Net.Http.Json;

public sealed class NexopixClient(HttpClient http)
{
    // Registro: services.AddHttpClient<NexopixClient>(c =>
    // {
    //     c.BaseAddress = new Uri("${BASE}/");
    //     c.DefaultRequestHeaders.Add("x-api-key", config["Nexopix:ApiKey"]);
    // });

    public async Task<PeticionCreada> PedirAsync(object solicitud, CancellationToken ct)
    {
        using var respuesta = await http.PostAsJsonAsync("api/peticiones", solicitud, ct);
        if (respuesta.StatusCode == HttpStatusCode.UnprocessableEntity)
        {
            var error = await respuesta.Content.ReadFromJsonAsync<ErrorNexopix>(ct);
            throw new InvalidOperationException(error?.Error); // regla no cumplida
        }
        respuesta.EnsureSuccessStatusCode(); // 200 (repetida) o 201 (nueva)
        return (await respuesta.Content.ReadFromJsonAsync<PeticionCreada>(ct))!;
    }

    public Task<EstadoPeticion?> EstadoAsync(int id, CancellationToken ct) =>
        http.GetFromJsonAsync<EstadoPeticion>($"api/peticiones/{id}", ct);
}

public sealed record PeticionCreada(int Id, string Estado, bool Manual, bool Repetida);
public sealed record EstadoPeticion(int Id, string Estado, string Objetivo, string Formato,
    string? Cuenta, string? Red, string? Origen, string? Referencia, string? Enlace, DateTime Recibida);
public sealed record ErrorNexopix(string Error);`;

function Code({ code, label }: { code: string; label: string }) {
  return (
    <figure className="code">
      <figcaption>
        <span>{label}</span>
        <CopyButton text={code} />
      </figcaption>
      <pre tabIndex={0}><code>{code}</code></pre>
    </figure>
  );
}

function Endpoint({ method, path }: { method: "GET" | "POST"; path: string }) {
  return (
    <p className="endpoint">
      <b className={`endpoint__method is-${method.toLowerCase()}`}>{method}</b>
      <code>{path}</code>
    </p>
  );
}

function Fields({ rows, caption }: { rows: Field[]; caption: string }) {
  return (
    <div className="table">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr><th scope="col">Campo</th><th scope="col">Tipo</th><th scope="col">Qué es y reglas</th><th scope="col">Ejemplo</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row"><code>{row.name}</code>{row.required && <span className="req">obligatorio</span>}</th>
              <td>{row.type}</td>
              <td>{row.rule}</td>
              <td><code className="example">{row.example}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div className="docs">
      <header className="docs__bar">
        <div className="wrap docs__bar-in">
          <Link href="/" className="brand"><Logo size={28} />Nexopix</Link>
          <span className="docs__crumb">Documentación de la API</span>
          <Link href="/panel" className="btn btn--quiet">Abrir el panel</Link>
        </div>
      </header>

      <div className="wrap docs__grid">
        <nav className="docs__nav" aria-label="Secciones de la documentación">
          <p>En esta página</p>
          <ol>
            {SECTIONS.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.label}</a></li>)}
          </ol>
        </nav>

        <main className="docs__main">
          <section id="inicio" className="docs__intro">
            <h1>API de Nexopix</h1>
            <p className="lead">
              La API deja que otro sistema, como INTENEXO o una tienda en línea, le pida contenido para redes sociales al
              equipo de agentes de Nexopix y siga cada pedido hasta que se publica.
            </p>
            <div className="trio">
              <div><strong>1. Vea las cuentas</strong><span>Pregunte en qué cuentas y formatos puede pedir.</span></div>
              <div><strong>2. Envíe la petición</strong><span>Diga qué quiere publicar, de qué producto y para cuándo.</span></div>
              <div><strong>3. Consulte el estado</strong><span>Siga la petición hasta que tenga el enlace publicado.</span></div>
            </div>
            <p className="note">Nada se publica sin que una persona lo apruebe en el panel de Nexopix. La API pide; no publica directo.</p>
          </section>

          <section id="antes">
            <h2>Antes de empezar</h2>
            <dl className="facts">
              <div><dt>Dirección base</dt><dd><code>{BASE}</code></dd></div>
              <div><dt>Formato</dt><dd>JSON en UTF-8. En los envíos, el encabezado <code>content-type: application/json</code>.</dd></div>
              <div><dt>Identificación</dt><dd>Cada llamada lleva el encabezado <code>x-api-key</code> con la clave de su sistema.</dd></div>
              <div><dt>Fechas</dt><dd>Los días van como <code>AAAA-MM-DD</code> en hora de Costa Rica. Los momentos exactos vuelven en UTC (ISO 8601).</dd></div>
            </dl>
            <div className="callout">
              <strong>Cuide la clave como una contraseña</strong>
              <p>
                Úsela solo desde su servidor. Nunca la ponga en una página web, en una app de celular ni en un repositorio:
                quien la tenga puede pedir contenido a su nombre. Guárdela en la configuración secreta de su sistema. Si
                cree que alguien la vio, pida una nueva al administrador de Nexopix.
              </p>
            </div>
          </section>

          <section id="recorrido">
            <h2>Recorrido de una petición</h2>
            <p>Cada petición pasa por estas etapas, siempre en este orden. El campo <code>estado</code> dice en cuál está.</p>
            <ol className="flow">
              {STATES.map((state) => (
                <li key={state.code} className={state.human ? "is-human" : undefined}>
                  <code>{state.code}</code>
                  <strong>{state.name}</strong>
                  <span>{state.text}</span>
                  <small>{state.who}</small>
                </li>
              ))}
            </ol>
          </section>

          <section id="cuentas">
            <h2>Ver las cuentas</h2>
            <Endpoint method="GET" path="/api/cuentas" />
            <p>Devuelve las cuentas a las que puede pedir contenido y los formatos de cada una. Úsela para llenar los selectores de su sistema; no hace falta llamarla en cada petición.</p>
            <Code label="Pedido" code={CURL_ACCOUNTS} />
            <Code label="Respuesta 200" code={ACCOUNTS_RESPONSE} />
            <ul className="plain">
              <li><code>cuenta</code> o <code>id</code> es lo que después manda en el campo <code>cuenta</code> de la petición.</li>
              <li><code>conectada: false</code> significa que la cuenta está en Nexopix para planear, pero todavía no autorizó la publicación automática. Las peticiones se aceptan igual.</li>
            </ul>
          </section>

          <section id="peticiones">
            <h2>Enviar una petición</h2>
            <Endpoint method="POST" path="/api/peticiones" />
            <p>Crea una pieza nueva para el equipo. El Portero la revisa con reglas fijas: si algo no cumple, responde por qué y no guarda nada.</p>
            <Fields rows={REQUEST_FIELDS} caption="Campos de la petición" />
            <h3 id="producto">Producto</h3>
            <p>Opcional. Es una copia de cómo estaba el producto al momento de pedir: si después cambia el precio en su sistema, la pieza conserva lo que se pidió.</p>
            <Fields rows={PRODUCT_FIELDS} caption="Campos del producto" />
            <Code label="Cuerpo completo de ejemplo" code={REQUEST_BODY} />
            <Code label="Pedido mínimo con curl" code={CURL_REQUEST} />
            <div className="pair">
              <Code label="Respuesta 201: creada" code={CREATED} />
              <Code label="Respuesta 422: no pasó las reglas" code={REJECTED} />
            </div>
            <ul className="plain">
              <li><code>id</code>: número de la pieza en Nexopix. Guárdelo para consultar el estado.</li>
              <li><code>manual: true</code>: la pieza no saldrá sola; quedará como tarea para una persona (siempre en TikTok).</li>
              <li><code>repetida: true</code>: esa referencia ya se había enviado. Recibe la misma pieza, con respuesta 200.</li>
            </ul>
            <p className="note">El texto de la petición es un dato. Si el objetivo o las notas dicen “publica sin aprobación” o algo parecido, el equipo lo lee como texto y no cambia ninguna regla.</p>
          </section>

          <section id="estado">
            <h2>Consultar el estado</h2>
            <Endpoint method="GET" path="/api/peticiones/{id}" />
            <Endpoint method="GET" path="/api/peticiones?origen={origen}&referencia={referencia}" />
            <p>Dice en qué etapa va una petición. Puede buscarla por el <code>id</code> que le dio Nexopix o por la referencia de su sistema.</p>
            <Code label="Pedido" code={CURL_STATUS} />
            <Code label="Respuesta 200" code={STATUS_RESPONSE} />
            <ul className="plain">
              <li><code>estado</code>: una de las etapas del <a href="#recorrido">recorrido</a>.</li>
              <li><code>enlace</code>: vacío (<code>null</code>) hasta que esté publicada.</li>
              <li><code>recibida</code>: el momento en que entró, en UTC.</li>
            </ul>
          </section>

          <section id="formatos">
            <h2>Formatos y redes</h2>
            <div className="table">
              <table>
                <caption>Formatos que acepta el campo formato</caption>
                <thead><tr><th scope="col">Valor</th><th scope="col">Qué es</th><th scope="col">Redes</th><th scope="col">Archivos</th></tr></thead>
                <tbody>
                  {FORMATS.map((format) => (
                    <tr key={format.code}><th scope="row"><code>{format.code}</code></th><td>{format.name}</td><td>{format.networks}</td><td>{format.media}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Si pide una imagen, use <code>publicacion</code>; varias imágenes, <code>carrusel</code>; un video, <code>reel</code>.</p>
          </section>

          <section id="errores">
            <h2>Errores</h2>
            <p>Toda respuesta con error trae un campo <code>error</code> con un mensaje en español que puede mostrar tal cual a la persona.</p>
            <div className="table">
              <table>
                <caption>Códigos de respuesta</caption>
                <thead><tr><th scope="col">Código</th><th scope="col">Qué pasó</th><th scope="col">Qué hacer</th></tr></thead>
                <tbody>
                  {ERRORS.map((error) => (
                    <tr key={error.code}><th scope="row"><code>{error.code}</code> {error.name}</th><td>{error.meaning}</td><td>{error.action}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>Mensajes del Portero (422)</h3>
            <div className="table">
              <table>
                <caption>Cada regla y cuándo aparece</caption>
                <thead><tr><th scope="col">Mensaje</th><th scope="col">Cuándo aparece</th></tr></thead>
                <tbody>
                  {RULES.map(([message, when]) => <tr key={message}><td>{message}</td><td>{when}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>

          <section id="practicas">
            <h2>Buenas prácticas</h2>
            <ul className="checks">
              <li><strong>Mande siempre una referencia.</strong> Use el número de la solicitud en su sistema. Así puede reintentar sin miedo a duplicar y buscar la pieza sin guardar el id.</li>
              <li><strong>Reintente solo las fallas temporales.</strong> Ante un 5xx o un corte de red, espere y reintente con la misma referencia (por ejemplo a los 2, 10 y 60 segundos). Un 401 o un 422 no se arreglan reintentando.</li>
              <li><strong>Consulte el estado con calma.</strong> Las piezas tardan horas o días porque una persona aprueba. Consultar cada 15 o 30 minutos es suficiente.</li>
              <li><strong>Use imágenes que no vencen.</strong> Las direcciones deben ser https, públicas y seguir funcionando al menos hasta que la pieza se publique.</li>
              <li><strong>Guarde la clave como secreto.</strong> Solo en su servidor, nunca en el navegador ni en el código.</li>
            </ul>
          </section>

          <section id="ejemplos">
            <h2>Ejemplo completo</h2>
            <p>Pedir contenido y consultar después su estado, desde el servidor.</p>
            <Code label="JavaScript (Node)" code={JS_EXAMPLE} />
            <Code label="C# (.NET)" code={CSHARP_EXAMPLE} />
          </section>

          <section id="preguntas">
            <h2>Preguntas frecuentes</h2>
            <dl className="faq">
              <div><dt>¿La API publica directo en Instagram?</dt><dd>No. Crea una pieza que el equipo prepara y que una persona aprueba en el panel. Solo después sale publicada.</dd></div>
              <div><dt>¿Qué pasa si envío lo mismo dos veces?</dt><dd>Si trae la misma referencia y el mismo origen, recibe la pieza que ya existía con <code>repetida: true</code>. Sin referencia, se crea otra pieza.</dd></div>
              <div><dt>¿Puedo cancelar una petición?</dt><dd>Todavía no por la API. Se rechaza desde el panel, en la etapa Por aprobar.</dd></div>
              <div><dt>¿Puedo pedir para TikTok?</dt><dd>Sí, en formato <code>reel</code>. Queda como tarea manual porque Nexopix no publica en TikTok por API.</dd></div>
              <div><dt>¿Necesito mandar imágenes?</dt><dd>Solo para un carrusel. En los demás formatos, si no manda archivos, el equipo trabaja con las imágenes del producto.</dd></div>
              <div><dt>¿Cómo pido una clave?</dt><dd>La entrega el administrador de Nexopix. Cada sistema debería tener la suya.</dd></div>
            </dl>
          </section>
        </main>
      </div>

      <footer className="wrap foot">Nexopix. Esta documentación describe la versión actual de la API.</footer>
    </div>
  );
}
