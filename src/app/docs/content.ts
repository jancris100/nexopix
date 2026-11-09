import type { Locale } from "../../i18n/locale";

/**
 * The API documentation in both languages. The API itself is always in English: paths, fields, statuses and error
 * codes never change with the language; only the explanations do. `code` in backticks and **bold** are rendered.
 */
export type Field = { name: string; type: string; required?: boolean; rule: string; example: string };
type Row = [string, string, string];

export type DocsText = {
  meta: { title: string; description: string };
  crumb: string;
  onThisPage: string;
  sections: { id: string; label: string }[];
  intro: { title: string; lead: string; steps: [string, string][]; note: string };
  before: { title: string; facts: [string, string][]; keyTitle: string; keyText: string };
  flow: { title: string; lead: string; statuses: { code: string; name: string; text: string; who: string; human?: boolean }[] };
  accounts: { title: string; lead: string; request: string; response: string; notes: string[] };
  requests: {
    title: string;
    lead: string;
    fieldsCaption: string;
    fields: Field[];
    productTitle: string;
    productLead: string;
    productCaption: string;
    productFields: Field[];
    fullBody: string;
    minimal: string;
    created: string;
    rejected: string;
    notes: string[];
    dataNote: string;
  };
  status: { title: string; lead: string; request: string; response: string; notes: string[] };
  formats: { title: string; caption: string; head: [string, string, string, string]; rows: [string, string, string, string][]; tip: string };
  errors: {
    title: string;
    lead: string;
    caption: string;
    head: [string, string, string];
    rows: Row[];
    rulesTitle: string;
    rulesCaption: string;
    rulesHead: [string, string, string];
    rules: Row[];
  };
  practices: { title: string; items: [string, string][] };
  examples: { title: string; lead: string; js: string; csharp: string };
  faq: { title: string; items: [string, string][] };
  table: { field: string; type: string; rule: string; example: string; required: string };
  copy: string;
  copied: string;
  footer: string;
};

const sectionIds = ["intro", "before", "flow", "accounts", "requests", "status", "formats", "errors", "practices", "examples", "faq"];

const es: DocsText = {
  meta: { title: "API de Nexopix", description: "Cómo otro sistema pide contenido a Nexopix y sigue cada petición hasta que se publica." },
  crumb: "Documentación de la API",
  onThisPage: "En esta página",
  sections: ["Qué es la API", "Antes de empezar", "Recorrido de una petición", "Ver las cuentas", "Enviar una petición", "Consultar el estado", "Formatos y redes", "Errores", "Buenas prácticas", "Ejemplo completo", "Preguntas frecuentes"].map((label, index) => ({ id: sectionIds[index], label })),
  intro: {
    title: "API de Nexopix",
    lead: "La API deja que otro sistema, como INTENEXO o una tienda en línea, le pida contenido para redes sociales al equipo de agentes de Nexopix y siga cada pedido hasta que se publica.",
    steps: [
      ["1. Vea las cuentas", "Pregunte en qué cuentas y formatos puede pedir."],
      ["2. Envíe la petición", "Diga qué quiere publicar, de qué producto y para cuándo."],
      ["3. Consulte el estado", "Siga la petición hasta que tenga el enlace publicado."],
    ],
    note: "La API está en inglés: direcciones, campos, estados y códigos de error son siempre los mismos. Esta página explica en español lo que significa cada uno.",
  },
  before: {
    title: "Antes de empezar",
    facts: [
      ["Dirección base", "`https://nexopix.vercel.app`"],
      ["Formato", "JSON en UTF-8. En los envíos, el encabezado `content-type: application/json`."],
      ["Identificación", "Cada llamada lleva el encabezado `x-api-key` con la clave de su sistema."],
      ["Rastreo", "Opcional: el encabezado `x-trace-id` (letras, números y guiones, hasta 64) con el código de rastreo de su sistema. Queda guardado en el recorrido de la pieza para seguir una misma petición en los dos sistemas."],
      ["Idioma de los errores", "Los mensajes de error vienen en inglés. Con el encabezado `accept-language: es` vienen en español. El campo `code` nunca cambia."],
      ["Fechas", "Los días van como `YYYY-MM-DD` en hora de Costa Rica. Los momentos exactos vuelven en UTC (ISO 8601)."],
    ],
    keyTitle: "Cuide la clave como una contraseña",
    keyText: "Úsela solo desde su servidor. Nunca la ponga en una página web, en una app de celular ni en un repositorio: quien la tenga puede pedir contenido a su nombre. Guárdela en la configuración secreta de su sistema. Si cree que alguien la vio, pida una nueva al administrador de Nexopix.",
  },
  flow: {
    title: "Recorrido de una petición",
    lead: "Cada petición pasa por estas etapas, siempre en este orden. El campo `status` dice en cuál está. Nada se publica sin que una persona lo apruebe.",
    statuses: [
      { code: "received", name: "Recibida", text: "Pasó las reglas y quedó guardada. Entra al equipo.", who: "Portero" },
      { code: "in_production", name: "En producción", text: "El equipo escribe el texto y prepara las imágenes o el video.", who: "Guionista" },
      { code: "pending_approval", name: "Por aprobar", text: "Espera que alguien la apruebe en el panel. Si la rechaza, vuelve a producción.", who: "Una persona", human: true },
      { code: "scheduled", name: "Programada", text: "Aprobada y con día y hora para salir.", who: "Programador" },
      { code: "published", name: "Publicada", text: "Ya está en la red. El campo `permalink` trae la dirección de la publicación.", who: "Analista" },
    ],
  },
  accounts: {
    title: "Ver las cuentas",
    lead: "Devuelve las cuentas a las que puede pedir contenido y los formatos de cada una. Úsela para llenar los selectores de su sistema; no hace falta llamarla en cada petición.",
    request: "Pedido",
    response: "Respuesta 200",
    notes: [
      "`handle` o `id` es lo que después manda en el campo `account` de la petición.",
      "`connected: false` significa que la cuenta está en Nexopix para planear, pero todavía no autorizó la publicación automática. Las peticiones se aceptan igual.",
    ],
  },
  requests: {
    title: "Enviar una petición",
    lead: "Crea una pieza nueva para el equipo. El Portero la revisa con reglas fijas: si algo no cumple, responde por qué y no guarda nada.",
    fieldsCaption: "Campos de la petición",
    fields: [
      { name: "account", type: "texto", required: true, rule: "El `id` o el `handle` (`@marca`) de una cuenta que devuelve Ver las cuentas.", example: '"@intenexo.cr"' },
      { name: "network", type: "texto", required: true, rule: "`instagram`, `facebook` o `tiktok`. Debe ser la misma red de la cuenta.", example: '"instagram"' },
      { name: "format", type: "texto", required: true, rule: "Uno de los formatos que admite esa red. Ver Formatos y redes.", example: '"carousel"' },
      { name: "goal", type: "texto", required: true, rule: "Qué se quiere lograr con la publicación, en una frase. De 3 a 120 caracteres.", example: '"December juicer promo"' },
      { name: "reference", type: "texto", rule: "El número o código que **su sistema** le da a esta petición. Si la envía dos veces, Nexopix no crea una segunda pieza. Hasta 120 caracteres: letras, números y `. : _ -`", example: '"intenexo:company-12:4581"' },
      { name: "source", type: "texto", rule: "Quién envía. Minúsculas, números y guiones, hasta 40. Si manda `reference` sin `source`, se usa `api`.", example: '"intenexo"' },
      { name: "product", type: "objeto", rule: "El producto del que trata la publicación. Ver la tabla Producto.", example: "{ … }" },
      { name: "media", type: "lista de textos", rule: "Imágenes o videos para usar, como direcciones https públicas. Hasta 10. Si no manda ninguna, se usan las imágenes del producto.", example: '["https://…/1.jpg"]' },
      { name: "publishOn", type: "texto", rule: "Día en que quiere que salga, como `YYYY-MM-DD`, hora de Costa Rica. No puede ser un día que ya pasó. La petición aparece ese día en la semana del panel.", example: '"2026-11-20"' },
      { name: "notes", type: "texto", rule: "Indicaciones para el equipo: tono, descuento, qué evitar. Hasta 500 caracteres.", example: '"15% off"' },
      { name: "mode", type: "texto", rule: "`auto` (Nexopix publica después de la aprobación) o `manual` (queda como tarea para una persona). Si no lo manda, es `auto`. TikTok siempre es `manual`.", example: '"auto"' },
    ],
    productTitle: "Producto",
    productLead: "Opcional. Es una copia de cómo estaba el producto al momento de pedir: si después cambia el precio en su sistema, la pieza conserva lo que se pidió.",
    productCaption: "Campos del producto",
    productFields: [
      { name: "name", type: "texto", required: true, rule: "De 2 a 150 caracteres.", example: '"Electric juicer"' },
      { name: "price", type: "número", rule: "Cero o mayor, sin símbolo de moneda ni separadores de miles.", example: "12500" },
      { name: "currency", type: "texto", rule: "Código de 3 letras mayúsculas: `CRC`, `USD`…", example: '"CRC"' },
      { name: "description", type: "texto", rule: "Hasta 1000 caracteres.", example: '"Fresh juice in 10 seconds."' },
      { name: "url", type: "texto", rule: "Dirección https de la página del producto. Los enlaces que publique el equipo apuntan aquí.", example: '"https://shop.cr/p/juicer"' },
      { name: "images", type: "lista de textos", rule: "Hasta 10 direcciones https públicas.", example: '["https://…/a.jpg"]' },
    ],
    fullBody: "Cuerpo completo de ejemplo",
    minimal: "Pedido mínimo con curl",
    created: "Respuesta 201: creada",
    rejected: "Respuesta 422: no pasó las reglas",
    notes: [
      "`id`: número de la pieza en Nexopix. Guárdelo para consultar el estado.",
      "`manual: true`: la pieza no saldrá sola; quedará como tarea para una persona (siempre en TikTok).",
      "`duplicate: true`: esa referencia ya se había enviado. Recibe la misma pieza, con respuesta 200.",
    ],
    dataNote: "El texto de la petición es un dato. Si `goal` o `notes` dicen “publica sin aprobación” o algo parecido, el equipo lo lee como texto y no cambia ninguna regla.",
  },
  status: {
    title: "Consultar el estado",
    lead: "Dice en qué etapa va una petición. Puede buscarla por el `id` que le dio Nexopix o por la referencia de su sistema.",
    request: "Pedido",
    response: "Respuesta 200",
    notes: [
      "`status`: una de las etapas del Recorrido de una petición.",
      "`permalink`: vacío (`null`) hasta que esté publicada.",
      "`receivedAt`: el momento en que entró, en UTC.",
      "`events`: el recorrido completo, del más viejo al más nuevo. Cada evento trae `at` (UTC), `actor` (`gatekeeper`, `router`, `strategist`, `writer`, `human`, `scheduler` o `analyst`), `type` (`received`, `repeated`, `routed`, `advanced`, `approval_requested`, `approved`, `rejected`, `content_updated`, `scheduled`, `publish_failed` o `published`), `detail` y `traceId` si usted lo envió.",
    ],
  },
  formats: {
    title: "Formatos y redes",
    caption: "Valores que acepta el campo format",
    head: ["Valor", "Qué es", "Redes", "Archivos"],
    rows: [
      ["reel", "Reel", "Instagram, Facebook, TikTok", "Un video."],
      ["post", "Publicación", "Instagram, Facebook", "Una imagen."],
      ["carousel", "Carrusel", "Instagram, Facebook", "De 2 a 10 imágenes, obligatorias (en `media` o en `product.images`)."],
      ["story", "Historia", "Instagram, Facebook", "Una imagen o un video vertical."],
      ["ad", "Meta Ads", "Instagram, Facebook", "Imagen o video para un anuncio pagado."],
    ],
    tip: "Para una imagen use `post`; para varias, `carousel`; para un video, `reel`.",
  },
  errors: {
    title: "Errores",
    lead: "Toda respuesta con error tiene la misma forma: `{ \"error\": { \"code\": \"…\", \"message\": \"…\" } }`. Su programa decide con `code`; a la persona le muestra `message`.",
    caption: "Códigos de respuesta",
    head: ["Código", "Qué pasó", "Qué hacer"],
    rows: [
      ["200", "Envió una referencia que ya había enviado. Devuelve la misma pieza con `duplicate: true`.", "Nada. Use el `id` que recibe."],
      ["201", "La petición pasó las reglas y es una pieza nueva.", "Guarde el `id` para consultar el estado."],
      ["400 `body_not_json` · `reference_missing`", "Lo que llegó no es un objeto JSON, o falta la referencia en la consulta.", "Revise el encabezado `content-type` y el cuerpo."],
      ["401 `invalid_key`", "Falta el encabezado `x-api-key` o la clave no coincide.", "Revise la clave. No reintente: fallará igual."],
      ["404 `not_found`", "No hay una petición con ese `id` o esa referencia.", "Revise el número, `source` y `reference`."],
      ["422", "No pasó una regla. `code` dice cuál (ver la tabla siguiente).", "Muestre `message` a la persona y corrija. No reintente igual."],
      ["503 `api_disabled`", "El servidor no tiene la clave de la API configurada.", "Avise al administrador de Nexopix."],
      ["5xx", "Algo falló del lado de Nexopix o de la red.", "Reintente con la misma referencia: no se duplica."],
    ],
    rulesTitle: "Códigos del Portero (422)",
    rulesCaption: "Cada regla, su código y cuándo aparece",
    rulesHead: ["code", "Mensaje (es)", "Cuándo aparece"],
    rules: [
      ["goal_missing", "Escribe qué quieres publicar.", "`goal` vacío o de menos de 3 caracteres."],
      ["goal_too_long", "El objetivo admite hasta 120 caracteres.", "`goal` demasiado largo."],
      ["account_unknown", "Esa cuenta no está registrada.", "`account` no coincide con ningún `id` ni `handle`."],
      ["network_unavailable", "Esa red no está disponible.", "`network` no es `instagram`, `facebook` ni `tiktok`."],
      ["account_network_mismatch", "@marca no es una cuenta de instagram.", "La cuenta existe, pero es de otra red."],
      ["format_not_allowed", "instagram no admite el formato X.", "El formato no existe o esa red no lo admite."],
      ["media_too_many", "Se admiten hasta 10 archivos.", "`media` trae más de 10 elementos."],
      ["media_not_https", "Cada archivo debe ser una dirección https pública.", "Algún elemento de `media` no empieza con `https://`."],
      ["carousel_media_count", "Un carrusel necesita de 2 a 10 imágenes.", "`carousel` con menos de 2 imágenes entre `media` y `product.images`."],
      ["product_name", "El producto necesita un nombre de 2 a 150 caracteres.", "`product.name` falta o no cumple el largo."],
      ["product_price", "El precio debe ser un número de cero o más.", "`product.price` negativo o escrito como texto."],
      ["product_currency", "La moneda debe ser un código de 3 letras, como CRC o USD.", "`product.currency` distinto de tres mayúsculas."],
      ["product_url", "El enlace del producto debe ser una dirección https.", "`product.url` no empieza con `https://`."],
      ["date_invalid", "La fecha debe tener la forma AAAA-MM-DD.", "`publishOn` con otra forma."],
      ["date_past", "La fecha deseada ya pasó.", "`publishOn` anterior a hoy en Costa Rica."],
      ["reference_invalid", "La referencia admite letras, números y . : _ - hasta 120 caracteres.", "`reference` con espacios u otros símbolos."],
      ["source_invalid", "El origen admite minúsculas, números y guiones, hasta 40 caracteres.", "`source` con otros símbolos."],
      ["notes_too_long", "Las notas admiten hasta 500 caracteres.", "`notes` demasiado largas."],
      ["mode_invalid", "mode debe ser auto o manual.", "`mode` con otro valor."],
    ],
  },
  practices: {
    title: "Buenas prácticas",
    items: [
      ["Mande siempre una referencia.", "Use el número de la solicitud en su sistema. Así puede reintentar sin miedo a duplicar y buscar la pieza sin guardar el `id`."],
      ["Reintente solo las fallas temporales.", "Ante un 5xx o un corte de red, espere y reintente con la misma referencia (por ejemplo a los 2, 10 y 60 segundos). Un 401 o un 422 no se arreglan reintentando."],
      ["Decida con code, muestre message.", "El `code` no cambia nunca; el `message` puede mejorar su redacción con el tiempo."],
      ["Consulte el estado con calma.", "Las piezas tardan horas o días porque una persona aprueba. Consultar cada 15 o 30 minutos es suficiente."],
      ["Use imágenes que no vencen.", "Las direcciones deben ser https, públicas y seguir funcionando al menos hasta que la pieza se publique."],
      ["Guarde la clave como secreto.", "Solo en su servidor, nunca en el navegador ni en el código."],
    ],
  },
  examples: { title: "Ejemplo completo", lead: "Pedir contenido y consultar después su estado, desde el servidor.", js: "JavaScript (Node)", csharp: "C# (.NET)" },
  faq: {
    title: "Preguntas frecuentes",
    items: [
      ["¿La API publica directo en Instagram?", "No. Crea una pieza que el equipo prepara y que una persona aprueba en el panel. Solo después sale publicada."],
      ["¿Por qué la API está en inglés?", "Para que cualquier sistema, de cualquier país, la use igual. Los mensajes para personas pueden venir en español con `accept-language: es`."],
      ["¿Qué pasa si envío lo mismo dos veces?", "Si trae la misma `reference` y el mismo `source`, recibe la pieza que ya existía con `duplicate: true`. Sin referencia, se crea otra pieza."],
      ["¿Puedo cancelar una petición?", "Todavía no por la API. Se rechaza desde el panel, en la etapa Por aprobar."],
      ["¿Puedo pedir para TikTok?", "Sí, en formato `reel`. Queda como tarea manual porque Nexopix no publica en TikTok por API."],
      ["¿Necesito mandar imágenes?", "Solo para un carrusel. En los demás formatos, si no manda archivos, el equipo trabaja con las imágenes del producto."],
      ["¿Cómo pido una clave?", "La entrega el administrador de Nexopix. Cada sistema debería tener la suya."],
    ],
  },
  table: { field: "Campo", type: "Tipo", rule: "Qué es y reglas", example: "Ejemplo", required: "obligatorio" },
  copy: "Copiar",
  copied: "Copiado",
  footer: "Nexopix. Esta documentación describe la versión actual de la API.",
};

const en: DocsText = {
  meta: { title: "Nexopix API", description: "How another system asks Nexopix for content and follows each request until it is published." },
  crumb: "API documentation",
  onThisPage: "On this page",
  sections: ["What the API is", "Before you start", "Life of a request", "List the accounts", "Send a request", "Check the status", "Formats and networks", "Errors", "Good practices", "Full example", "FAQ"].map((label, index) => ({ id: sectionIds[index], label })),
  intro: {
    title: "Nexopix API",
    lead: "The API lets another system, such as INTENEXO or an online store, ask Nexopix's team of agents for social media content and follow each request until it is published.",
    steps: [
      ["1. List the accounts", "Ask which accounts and formats you can request."],
      ["2. Send the request", "Say what you want to publish, about which product and for when."],
      ["3. Check the status", "Follow the request until it has its published link."],
    ],
    note: "Nothing is published until a person approves it in the Nexopix panel. The API asks; it does not publish directly.",
  },
  before: {
    title: "Before you start",
    facts: [
      ["Base URL", "`https://nexopix.vercel.app`"],
      ["Format", "JSON in UTF-8. When sending, the header `content-type: application/json`."],
      ["Authentication", "Every call carries the `x-api-key` header with your system's key."],
      ["Tracing", "Optional: the `x-trace-id` header (letters, numbers and hyphens, up to 64) with your system's trace id. It is kept in the piece's trace so one request can be followed across both systems."],
      ["Error language", "Error messages come in English. With the header `accept-language: es` they come in Spanish. The `code` field never changes."],
      ["Dates", "Days are written `YYYY-MM-DD` in Costa Rica time. Exact moments come back in UTC (ISO 8601)."],
    ],
    keyTitle: "Treat the key like a password",
    keyText: "Use it only from your server. Never put it in a web page, a mobile app or a repository: whoever has it can request content on your behalf. Keep it in your system's secret configuration. If you think someone saw it, ask the Nexopix administrator for a new one.",
  },
  flow: {
    title: "Life of a request",
    lead: "Every request goes through these stages, always in this order. The `status` field says which one it is in. Nothing is published until a person approves it.",
    statuses: [
      { code: "received", name: "Received", text: "It passed the rules and was stored. It enters the team.", who: "Gatekeeper" },
      { code: "in_production", name: "In production", text: "The team writes the copy and prepares the images or the video.", who: "Writer" },
      { code: "pending_approval", name: "Pending approval", text: "It waits for someone to approve it in the panel. If rejected, it goes back to production.", who: "A person", human: true },
      { code: "scheduled", name: "Scheduled", text: "Approved, with a day and time to go out.", who: "Scheduler" },
      { code: "published", name: "Published", text: "It is live. The `permalink` field has the post's address.", who: "Analyst" },
    ],
  },
  accounts: {
    title: "List the accounts",
    lead: "Returns the accounts you can request content for and the formats each one takes. Use it to fill your system's selectors; there is no need to call it before every request.",
    request: "Request",
    response: "Response 200",
    notes: [
      "`handle` or `id` is what you later send in the request's `account` field.",
      "`connected: false` means the account is in Nexopix for planning but has not authorized automatic publishing yet. Requests are accepted anyway.",
    ],
  },
  requests: {
    title: "Send a request",
    lead: "Creates a new piece for the team. The Gatekeeper checks it with fixed rules: if something fails, it says why and stores nothing.",
    fieldsCaption: "Request fields",
    fields: [
      { name: "account", type: "string", required: true, rule: "The `id` or `handle` (`@brand`) of an account returned by List the accounts.", example: '"@intenexo.cr"' },
      { name: "network", type: "string", required: true, rule: "`instagram`, `facebook` or `tiktok`. It must be the account's network.", example: '"instagram"' },
      { name: "format", type: "string", required: true, rule: "One of the formats that network takes. See Formats and networks.", example: '"carousel"' },
      { name: "goal", type: "string", required: true, rule: "What the post should achieve, in one sentence. 3 to 120 characters.", example: '"December juicer promo"' },
      { name: "reference", type: "string", rule: "The number or code **your system** gives this request. Sent twice, Nexopix does not create a second piece. Up to 120 characters: letters, numbers and `. : _ -`", example: '"intenexo:company-12:4581"' },
      { name: "source", type: "string", rule: "Who sends it. Lowercase letters, numbers and hyphens, up to 40. If you send `reference` without `source`, `api` is used.", example: '"intenexo"' },
      { name: "product", type: "object", rule: "The product the post is about. See the Product table.", example: "{ … }" },
      { name: "media", type: "string list", rule: "Images or videos to use, as public https addresses. Up to 10. If you send none, the product's images are used.", example: '["https://…/1.jpg"]' },
      { name: "publishOn", type: "string", rule: "Day you want it out, as `YYYY-MM-DD`, Costa Rica time. It cannot be a day that already passed. The request shows on that day in the panel's week.", example: '"2026-11-20"' },
      { name: "notes", type: "string", rule: "Guidance for the team: tone, discount, what to avoid. Up to 500 characters.", example: '"15% off"' },
      { name: "mode", type: "string", rule: "`auto` (Nexopix publishes after approval) or `manual` (it becomes a task for a person). Defaults to `auto`. TikTok is always `manual`.", example: '"auto"' },
    ],
    productTitle: "Product",
    productLead: "Optional. A copy of the product as it was when requested: if the price later changes in your system, the piece keeps what was asked.",
    productCaption: "Product fields",
    productFields: [
      { name: "name", type: "string", required: true, rule: "2 to 150 characters.", example: '"Electric juicer"' },
      { name: "price", type: "number", rule: "Zero or more, without currency symbol or thousands separators.", example: "12500" },
      { name: "currency", type: "string", rule: "3-letter uppercase code: `CRC`, `USD`…", example: '"CRC"' },
      { name: "description", type: "string", rule: "Up to 1000 characters.", example: '"Fresh juice in 10 seconds."' },
      { name: "url", type: "string", rule: "https address of the product page. Links the team publishes point here.", example: '"https://shop.cr/p/juicer"' },
      { name: "images", type: "string list", rule: "Up to 10 public https addresses.", example: '["https://…/a.jpg"]' },
    ],
    fullBody: "Full example body",
    minimal: "Minimal request with curl",
    created: "Response 201: created",
    rejected: "Response 422: a rule failed",
    notes: [
      "`id`: the piece's number in Nexopix. Keep it to check the status.",
      "`manual: true`: the piece will not go out on its own; it becomes a task for a person (always on TikTok).",
      "`duplicate: true`: that reference was already sent. You get the same piece, with a 200 response.",
    ],
    dataNote: "The text of a request is data. If `goal` or `notes` say “publish without approval” or similar, the team reads it as text and no rule changes.",
  },
  status: {
    title: "Check the status",
    lead: "Says which stage a request is in. Look it up by the `id` Nexopix gave you or by your system's reference.",
    request: "Request",
    response: "Response 200",
    notes: [
      "`status`: one of the stages in Life of a request.",
      "`permalink`: empty (`null`) until it is published.",
      "`receivedAt`: when it came in, in UTC.",
      "`events`: the full trace, oldest first. Each event has `at` (UTC), `actor` (`gatekeeper`, `router`, `strategist`, `writer`, `human`, `scheduler` or `analyst`), `type` (`received`, `repeated`, `routed`, `advanced`, `approval_requested`, `approved`, `rejected`, `content_updated`, `scheduled`, `publish_failed` or `published`), `detail` and `traceId` when you sent one.",
    ],
  },
  formats: {
    title: "Formats and networks",
    caption: "Values accepted by the format field",
    head: ["Value", "What it is", "Networks", "Files"],
    rows: [
      ["reel", "Reel", "Instagram, Facebook, TikTok", "One video."],
      ["post", "Post", "Instagram, Facebook", "One image."],
      ["carousel", "Carousel", "Instagram, Facebook", "2 to 10 images, required (in `media` or `product.images`)."],
      ["story", "Story", "Instagram, Facebook", "One vertical image or video."],
      ["ad", "Meta Ads", "Instagram, Facebook", "Image or video for a paid ad."],
    ],
    tip: "For one image use `post`; for several, `carousel`; for a video, `reel`.",
  },
  errors: {
    title: "Errors",
    lead: "Every error response has the same shape: `{ \"error\": { \"code\": \"…\", \"message\": \"…\" } }`. Your program decides with `code`; the person sees `message`.",
    caption: "Response codes",
    head: ["Code", "What happened", "What to do"],
    rows: [
      ["200", "You sent a reference you had already sent. Returns the same piece with `duplicate: true`.", "Nothing. Use the `id` you get."],
      ["201", "The request passed the rules and is a new piece.", "Keep the `id` to check the status."],
      ["400 `body_not_json` · `reference_missing`", "What arrived is not a JSON object, or the lookup is missing the reference.", "Check the `content-type` header and the body."],
      ["401 `invalid_key`", "The `x-api-key` header is missing or the key does not match.", "Check the key. Do not retry: it will fail the same way."],
      ["404 `not_found`", "There is no request with that `id` or reference.", "Check the number, `source` and `reference`."],
      ["422", "A rule failed. `code` says which one (see the next table).", "Show `message` to the person and fix it. Do not retry unchanged."],
      ["503 `api_disabled`", "The server does not have the API key configured.", "Tell the Nexopix administrator."],
      ["5xx", "Something failed on Nexopix's side or in the network.", "Retry with the same reference: it will not duplicate."],
    ],
    rulesTitle: "Gatekeeper codes (422)",
    rulesCaption: "Each rule, its code and when it shows up",
    rulesHead: ["code", "Message (en)", "When it shows up"],
    rules: [
      ["goal_missing", "Write what you want to publish.", "`goal` empty or shorter than 3 characters."],
      ["goal_too_long", "The goal allows up to 120 characters.", "`goal` too long."],
      ["account_unknown", "That account is not registered.", "`account` matches no `id` or `handle`."],
      ["network_unavailable", "That network is not available.", "`network` is not `instagram`, `facebook` or `tiktok`."],
      ["account_network_mismatch", "@brand is not a instagram account.", "The account exists but belongs to another network."],
      ["format_not_allowed", "instagram does not accept the format X.", "The format does not exist or that network does not take it."],
      ["media_too_many", "Up to 10 files are allowed.", "`media` has more than 10 items."],
      ["media_not_https", "Each file must be a public https address.", "An item of `media` does not start with `https://`."],
      ["carousel_media_count", "A carousel needs 2 to 10 images.", "`carousel` with fewer than 2 images between `media` and `product.images`."],
      ["product_name", "The product needs a name of 2 to 150 characters.", "`product.name` missing or the wrong length."],
      ["product_price", "The price must be a number of zero or more.", "`product.price` negative or sent as text."],
      ["product_currency", "The currency must be a 3-letter code, such as CRC or USD.", "`product.currency` is not three uppercase letters."],
      ["product_url", "The product url must be an https address.", "`product.url` does not start with `https://`."],
      ["date_invalid", "The date must look like YYYY-MM-DD.", "`publishOn` in another shape."],
      ["date_past", "The requested date has already passed.", "`publishOn` before today in Costa Rica."],
      ["reference_invalid", "The reference allows letters, numbers and . : _ - up to 120 characters.", "`reference` with spaces or other symbols."],
      ["source_invalid", "The source allows lowercase letters, numbers and hyphens, up to 40 characters.", "`source` with other symbols."],
      ["notes_too_long", "Notes allow up to 500 characters.", "`notes` too long."],
      ["mode_invalid", "mode must be auto or manual.", "`mode` with another value."],
    ],
  },
  practices: {
    title: "Good practices",
    items: [
      ["Always send a reference.", "Use the request's number in your system. You can then retry without fear of duplicates and look the piece up without storing the `id`."],
      ["Retry only temporary failures.", "On a 5xx or a network cut, wait and retry with the same reference (for example after 2, 10 and 60 seconds). A 401 or a 422 is not fixed by retrying."],
      ["Decide with code, show message.", "`code` never changes; the wording of `message` may improve over time."],
      ["Check the status calmly.", "Pieces take hours or days because a person approves them. Checking every 15 or 30 minutes is enough."],
      ["Use images that do not expire.", "Addresses must be https, public and keep working at least until the piece is published."],
      ["Keep the key secret.", "Only on your server, never in the browser or in code."],
    ],
  },
  examples: { title: "Full example", lead: "Request content and later check its status, from the server.", js: "JavaScript (Node)", csharp: "C# (.NET)" },
  faq: {
    title: "FAQ",
    items: [
      ["Does the API publish straight to Instagram?", "No. It creates a piece that the team prepares and a person approves in the panel. Only then is it published."],
      ["What if I send the same thing twice?", "With the same `reference` and `source`, you get the existing piece with `duplicate: true`. Without a reference, another piece is created."],
      ["Can I cancel a request?", "Not through the API yet. It is rejected from the panel, at the Pending approval stage."],
      ["Can I request for TikTok?", "Yes, as `reel`. It becomes a manual task because Nexopix does not publish to TikTok through the API."],
      ["Do I need to send images?", "Only for a carousel. For the other formats, if you send no files, the team works with the product's images."],
      ["Can error messages come in Spanish?", "Yes: send `accept-language: es`. The `code` stays the same in every language."],
      ["How do I get a key?", "The Nexopix administrator gives it out. Each system should have its own."],
    ],
  },
  table: { field: "Field", type: "Type", rule: "What it is and rules", example: "Example", required: "required" },
  copy: "Copy",
  copied: "Copied",
  footer: "Nexopix. This documentation describes the current version of the API.",
};

export const DOCS: Record<Locale, DocsText> = { es, en };
