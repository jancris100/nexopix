import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../../components/panel/Marks";
import { LanguageSwitch } from "../../i18n/client";
import { getDictionary, getLocale } from "../../i18n/server";
import { DOCS, type Field } from "./content";
import CopyButton from "./CopyButton";
import DocsNav from "./DocsNav";
import "./docs.css";

export async function generateMetadata(): Promise<Metadata> {
  const doc = DOCS[await getLocale()];
  return { title: doc.meta.title, description: doc.meta.description };
}

const BASE = "https://nexopix.vercel.app";

/** `code` and **bold** inside the texts of the documentation. */
function rich(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <b key={index}>{part.slice(2, -2)}</b>;
    return part;
  });
}

const CURL_ACCOUNTS = `curl ${BASE}/api/accounts \\
  -H "x-api-key: YOUR_KEY"`;

const ACCOUNTS_RESPONSE = `{
  "accounts": [
    {
      "id": "ig-17841400000000000",
      "handle": "@intenexo.cr",
      "network": "instagram",
      "brand": "INTENEXO",
      "connected": true,
      "formats": ["reel", "post", "carousel", "story", "ad"]
    }
  ]
}`;

const REQUEST_BODY = `{
  "account": "@intenexo.cr",
  "network": "instagram",
  "format": "carousel",
  "goal": "December juicer promo",
  "source": "intenexo",
  "reference": "intenexo:company-12:4581",
  "product": {
    "name": "Electric juicer",
    "price": 12500,
    "currency": "CRC",
    "description": "Fresh juice in 10 seconds.",
    "url": "https://shop.cr/p/juicer",
    "images": [
      "https://shop.cr/img/juicer-1.jpg",
      "https://shop.cr/img/juicer-2.jpg"
    ],
    "compareAtPrice": 15900
  },
  "publishOn": "2026-11-20",
  "notes": "15% off until December 31",
  "template": "offer",
  "creative": { "headline": "December juicer promo", "cta": "Buy now", "showPrice": true }
}`;

const CURL_TEMPLATES = `curl ${BASE}/api/templates \\
  -H "x-api-key: YOUR_KEY" \\
  -H "accept-language: es"`;

const TEMPLATES_RESPONSE = `{
  "templates": [
    { "id": "offer", "name": "Oferta", "description": "Precio grande, el precio anterior tachado y un llamado a comprar.", "formats": ["post", "carousel", "story"] },
    { "id": "launch", "name": "Lanzamiento", "description": "…", "formats": ["post", "carousel", "story"] }
  ]
}`;

const BRAND_BODY = `curl -X PUT ${BASE}/api/accounts/ig-17841400000000000/brand \\
  -H "x-api-key: YOUR_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "logoUrl": "https://shop.cr/logo.png",
    "brandColor": "#0B1F3A",
    "accentColor": "#FFB020",
    "defaultTemplate": "offer"
  }'`;

const CURL_REQUEST = `curl ${BASE}/api/requests \\
  -H "x-api-key: YOUR_KEY" \\
  -H "content-type: application/json" \\
  -H "x-trace-id: 4f1c0b9e2d7a4c55a1b3e8f6d2c4a901" \\
  -d '{
    "account": "@intenexo.cr",
    "network": "instagram",
    "format": "post",
    "goal": "December juicer promo",
    "source": "intenexo",
    "reference": "intenexo:company-12:4581"
  }'`;

const CREATED = `{
  "id": 34,
  "status": "received",
  "manual": false,
  "duplicate": false
}`;

const REJECTED = `{
  "error": {
    "code": "carousel_media_count",
    "message": "A carousel needs 2 to 10 images."
  }
}`;

const CURL_STATUS = `curl ${BASE}/api/requests/34 \\
  -H "x-api-key: YOUR_KEY"

# or with your system's reference:
curl "${BASE}/api/requests?source=intenexo&reference=intenexo:company-12:4581" \\
  -H "x-api-key: YOUR_KEY"`;

const STATUS_RESPONSE = `{
  "id": 34,
  "status": "published",
  "goal": "December juicer promo",
  "format": "carousel",
  "account": "@intenexo.cr",
  "network": "instagram",
  "source": "intenexo",
  "reference": "intenexo:company-12:4581",
  "permalink": "https://www.instagram.com/p/C0abc123/",
  "receivedAt": "2026-11-08T22:20:56.905Z",
  "events": [
    { "at": "2026-11-08T22:20:56.905Z", "actor": "gatekeeper", "type": "received",
      "detail": { "source": "intenexo", "reference": "intenexo:company-12:4581", "media": 2, "product": "Electric juicer" },
      "traceId": "4f1c0b9e2d7a4c55a1b3e8f6d2c4a901" },
    { "at": "2026-11-08T22:20:56.905Z", "actor": "router", "type": "routed",
      "detail": { "pipeline": "posts", "account": "@intenexo.cr", "format": "carousel", "manual": false, "publishOn": "2026-11-20" },
      "traceId": "4f1c0b9e2d7a4c55a1b3e8f6d2c4a901" },
    { "at": "2026-11-09T15:02:11.120Z", "actor": "writer", "type": "approval_requested", "detail": { "from": 1, "to": 2 }, "traceId": null },
    { "at": "2026-11-09T16:40:03.551Z", "actor": "human", "type": "approved", "detail": { "from": 2, "to": 3 }, "traceId": null }
  ]
}`;

const JS_EXAMPLE = `// On the server (Node 18 or newer). Never in the browser.
const BASE = "${BASE}";
const headers = {
  "x-api-key": process.env.NEXOPIX_API_KEY,
  "content-type": "application/json",
  "accept-language": "en", // or "es" for messages in Spanish
};

export async function requestContent(request) {
  const response = await fetch(\`\${BASE}/api/requests\`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });
  const data = await response.json();
  if (response.status === 422) throw new Error(data.error.message); // a rule failed: show it to the person
  if (!response.ok) throw new Error(\`Nexopix answered \${response.status}: \${data.error?.code}\`);
  return data; // { id, status, manual, duplicate }
}

export async function checkStatus(id) {
  const response = await fetch(\`\${BASE}/api/requests/\${id}\`, { headers });
  return response.ok ? response.json() : null;
}`;

const CSHARP_EXAMPLE = `// .NET 8 or newer. The key comes from configuration, never from code.
using System.Net;
using System.Net.Http.Json;

public sealed class NexopixClient(HttpClient http)
{
    // Registration: services.AddHttpClient<NexopixClient>(c =>
    // {
    //     c.BaseAddress = new Uri("${BASE}/");
    //     c.DefaultRequestHeaders.Add("x-api-key", config["Nexopix:ApiKey"]);
    //     c.DefaultRequestHeaders.AcceptLanguage.ParseAdd("es"); // messages in Spanish
    // });

    public async Task<RequestCreated> RequestAsync(object request, CancellationToken ct)
    {
        using var response = await http.PostAsJsonAsync("api/requests", request, ct);
        if (response.StatusCode == HttpStatusCode.UnprocessableEntity)
        {
            var body = await response.Content.ReadFromJsonAsync<ErrorBody>(ct);
            throw new NexopixRuleException(body!.Error.Code, body.Error.Message); // a rule failed
        }
        response.EnsureSuccessStatusCode(); // 200 (duplicate) or 201 (new)
        return (await response.Content.ReadFromJsonAsync<RequestCreated>(ct))!;
    }

    public Task<RequestStatus?> StatusAsync(int id, CancellationToken ct) =>
        http.GetFromJsonAsync<RequestStatus>($"api/requests/{id}", ct);
}

public sealed record RequestCreated(int Id, string Status, bool Manual, bool Duplicate);
public sealed record RequestStatus(int Id, string Status, string Goal, string Format, string? Account,
    string? Network, string? Source, string? Reference, string? Permalink, DateTime ReceivedAt);
public sealed record ErrorBody(ErrorDetail Error);
public sealed record ErrorDetail(string Code, string Message);
public sealed class NexopixRuleException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}`;

export default async function ApiDocs() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const doc = DOCS[locale];

  const Code = ({ code, label }: { code: string; label: string }) => (
    <figure className="code">
      <figcaption>
        <span>{label}</span>
        <CopyButton text={code} label={doc.copy} done={doc.copied} />
      </figcaption>
      <pre tabIndex={0}><code>{code}</code></pre>
    </figure>
  );

  const Fields = ({ rows, caption }: { rows: Field[]; caption: string }) => (
    <div className="table">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr><th scope="col">{doc.table.field}</th><th scope="col">{doc.table.type}</th><th scope="col">{doc.table.rule}</th><th scope="col">{doc.table.example}</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row"><code>{row.name}</code>{row.required && <span className="req">{doc.table.required}</span>}</th>
              <td>{row.type}</td>
              <td>{rich(row.rule)}</td>
              <td><code className="example">{row.example}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const Endpoint = ({ method, path }: { method: "GET" | "POST" | "PUT"; path: string }) => (
    <p className="endpoint">
      <b className={`endpoint__method is-${method.toLowerCase()}`}>{method}</b>
      <code>{path}</code>
    </p>
  );

  return (
    <div className="docs">
      <header className="docs__bar">
        <div className="wrap docs__bar-in">
          <Link href="/" className="brand"><Logo size={28} />Nexopix</Link>
          <span className="docs__crumb">{doc.crumb}</span>
          <LanguageSwitch />
          <Link href="/panel" className="btn btn--quiet docs__panel">{t.common.openPanel}</Link>
        </div>
      </header>

      <div className="wrap docs__grid">
        <DocsNav sections={doc.sections} label={doc.onThisPage} />

        <main className="docs__main">
          <section id="intro" className="docs__intro">
            <h1>{doc.intro.title}</h1>
            <p className="lead">{doc.intro.lead}</p>
            <div className="trio">
              {doc.intro.steps.map(([title, text]) => <div key={title}><strong>{title}</strong><span>{text}</span></div>)}
            </div>
            <p className="note">{rich(doc.intro.note)}</p>
          </section>

          <section id="before">
            <h2>{doc.before.title}</h2>
            <dl className="facts">
              {doc.before.facts.map(([name, text]) => <div key={name}><dt>{name}</dt><dd>{rich(text)}</dd></div>)}
            </dl>
            <div className="callout">
              <strong>{doc.before.keyTitle}</strong>
              <p>{doc.before.keyText}</p>
            </div>
          </section>

          <section id="flow">
            <h2>{doc.flow.title}</h2>
            <p>{rich(doc.flow.lead)}</p>
            <ol className="flow">
              {doc.flow.statuses.map((status) => (
                <li key={status.code} className={status.human ? "is-human" : undefined}>
                  <code>{status.code}</code>
                  <strong>{status.name}</strong>
                  <span>{rich(status.text)}</span>
                  <small>{status.who}</small>
                </li>
              ))}
            </ol>
          </section>

          <section id="accounts">
            <h2>{doc.accounts.title}</h2>
            <Endpoint method="GET" path="/api/accounts" />
            <p>{doc.accounts.lead}</p>
            <Code label={doc.accounts.request} code={CURL_ACCOUNTS} />
            <Code label={doc.accounts.response} code={ACCOUNTS_RESPONSE} />
            <ul className="plain">{doc.accounts.notes.map((note) => <li key={note}>{rich(note)}</li>)}</ul>
          </section>

          <section id="requests">
            <h2>{doc.requests.title}</h2>
            <Endpoint method="POST" path="/api/requests" />
            <p>{doc.requests.lead}</p>
            <Fields rows={doc.requests.fields} caption={doc.requests.fieldsCaption} />
            <h3 id="product">{doc.requests.productTitle}</h3>
            <p>{doc.requests.productLead}</p>
            <Fields rows={doc.requests.productFields} caption={doc.requests.productCaption} />
            <Code label={doc.requests.fullBody} code={REQUEST_BODY} />
            <Code label={doc.requests.minimal} code={CURL_REQUEST} />
            <div className="pair">
              <Code label={doc.requests.created} code={CREATED} />
              <Code label={doc.requests.rejected} code={REJECTED} />
            </div>
            <ul className="plain">{doc.requests.notes.map((note) => <li key={note}>{rich(note)}</li>)}</ul>
            <p className="note">{rich(doc.requests.dataNote)}</p>
          </section>

          <section id="status">
            <h2>{doc.status.title}</h2>
            <Endpoint method="GET" path="/api/requests/{id}" />
            <Endpoint method="GET" path="/api/requests?source={source}&reference={reference}" />
            <p>{rich(doc.status.lead)}</p>
            <Code label={doc.status.request} code={CURL_STATUS} />
            <Code label={doc.status.response} code={STATUS_RESPONSE} />
            <ul className="plain">{doc.status.notes.map((note) => <li key={note}>{rich(note)}</li>)}</ul>
          </section>

          <section id="formats">
            <h2>{doc.formats.title}</h2>
            <div className="table">
              <table>
                <caption>{doc.formats.caption}</caption>
                <thead><tr>{doc.formats.head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
                <tbody>
                  {doc.formats.rows.map(([value, name, networks, files]) => (
                    <tr key={value}><th scope="row"><code>{value}</code></th><td>{name}</td><td>{networks}</td><td>{rich(files)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>{rich(doc.formats.tip)}</p>
          </section>

          <section id="templates">
            <h2>{doc.templates.title}</h2>
            <p>{rich(doc.templates.lead)}</p>
            <h3>{doc.templates.listTitle}</h3>
            <Endpoint method="GET" path="/api/templates" />
            <p>{doc.templates.listLead}</p>
            <Code label={doc.templates.request} code={CURL_TEMPLATES} />
            <Code label={doc.templates.response} code={TEMPLATES_RESPONSE} />
            <h3>{doc.templates.brandTitle}</h3>
            <Endpoint method="PUT" path="/api/accounts/{id}/brand" />
            <p>{doc.templates.brandLead}</p>
            <Code label={doc.templates.brandBody} code={BRAND_BODY} />
            <ul className="plain">{doc.templates.notes.map((note) => <li key={note}>{rich(note)}</li>)}</ul>
          </section>

          <section id="errors">
            <h2>{doc.errors.title}</h2>
            <p>{rich(doc.errors.lead)}</p>
            <div className="table">
              <table>
                <caption>{doc.errors.caption}</caption>
                <thead><tr>{doc.errors.head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
                <tbody>
                  {doc.errors.rows.map(([code, meaning, action]) => (
                    <tr key={code}><th scope="row">{rich(code)}</th><td>{rich(meaning)}</td><td>{rich(action)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>{doc.errors.rulesTitle}</h3>
            <div className="table">
              <table>
                <caption>{doc.errors.rulesCaption}</caption>
                <thead><tr>{doc.errors.rulesHead.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
                <tbody>
                  {doc.errors.rules.map(([code, message, when]) => (
                    <tr key={code}><th scope="row"><code>{code}</code></th><td>{message}</td><td>{rich(when)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="practices">
            <h2>{doc.practices.title}</h2>
            <ul className="checks">
              {doc.practices.items.map(([title, text]) => <li key={title}><strong>{title}</strong>{rich(text)}</li>)}
            </ul>
          </section>

          <section id="examples">
            <h2>{doc.examples.title}</h2>
            <p>{doc.examples.lead}</p>
            <Code label={doc.examples.js} code={JS_EXAMPLE} />
            <Code label={doc.examples.csharp} code={CSHARP_EXAMPLE} />
          </section>

          <section id="faq">
            <h2>{doc.faq.title}</h2>
            <dl className="faq">
              {doc.faq.items.map(([question, answer]) => <div key={question}><dt>{question}</dt><dd>{rich(answer)}</dd></div>)}
            </dl>
          </section>
        </main>
      </div>

      <footer className="wrap foot">{doc.footer}</footer>
    </div>
  );
}
