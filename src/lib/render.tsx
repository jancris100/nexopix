import { ImageResponse } from "next/og";
import sharp from "sharp";
import { benefitsFrom, type Creative, type TemplateId } from "./templates";

/** Everything a template needs to draw one image. */
export type RenderInput = {
  template: TemplateId;
  format: string;
  photo: string | null;
  name: string;
  price: number | null;
  currency: string | null;
  compareAtPrice: number | null;
  description: string | null;
  creative: Creative;
  brand: { name: string; logoUrl: string | null; color: string | null; accent: string | null };
};

const DEFAULT_COLOR = "#14161A";
const DEFAULT_ACCENT = "#3FBF9A";

/** Instagram's portrait feed size, and the full screen of a story. */
export const sizeFor = (format: string) => (format === "story" ? { width: 1080, height: 1920 } : { width: 1080, height: 1350 });

const fonts = new Map<number, Promise<ArrayBuffer | null>>();

/** Inter from Google Fonts (TTF), once per weight and instance. Without it the default font is used. */
function font(weight: number) {
  if (!fonts.has(weight)) {
    fonts.set(
      weight,
      fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`, { headers: { "user-agent": "Mozilla/4.0" } })
        .then((response) => response.text())
        .then((css) => css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1])
        .then((url) => (url ? fetch(url).then((response) => response.arrayBuffer()) : null))
        .catch(() => null),
    );
  }
  return fonts.get(weight)!;
}

export function money(value: number, currency: string | null) {
  const code = currency ?? "CRC";
  try {
    return new Intl.NumberFormat("es-CR", { style: "currency", currency: code, maximumFractionDigits: code === "CRC" ? 0 : 2 }).format(value);
  } catch {
    return `${code} ${value.toLocaleString("es-CR")}`;
  }
}

/** Long headlines get a smaller size so they never run into the photo. */
const fit = (base: number, text: string) => Math.round(text.length > 40 ? base * 0.72 : text.length > 26 ? base * 0.86 : base);

/** Light or dark text over a color, by its luminance. */
function inkOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "#14161A" : "#FFFFFF";
}

function Logo({ input, dark }: { input: RenderInput; dark: boolean }) {
  return input.brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- drawn by the image renderer, not a page.
    <img src={input.brand.logoUrl} alt="" height={88} style={{ height: 88, maxWidth: 320, objectFit: "contain" }} />
  ) : (
    <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: dark ? "#FFFFFF" : "#14161A", letterSpacing: -1 }}>{input.brand.name}</div>
  );
}

function Photo({ input, style }: { input: RenderInput; style: React.CSSProperties }) {
  return input.photo ? (
    // eslint-disable-next-line @next/next/no-img-element -- drawn by the image renderer, not a page.
    <img src={input.photo} alt="" style={{ objectFit: "cover", ...style }} />
  ) : (
    <div style={{ display: "flex", background: "#E3E4DF", ...style }} />
  );
}

function Price({ input, accent, size }: { input: RenderInput; accent: string; size: number }) {
  if (input.price === null || input.creative.showPrice === false) return null;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
      <div style={{ display: "flex", fontSize: size, fontWeight: 800, color: accent, letterSpacing: -2 }}>{money(input.price, input.currency)}</div>
      {input.compareAtPrice !== null && input.compareAtPrice > input.price && (
        <div style={{ display: "flex", fontSize: size * 0.42, color: "rgba(255,255,255,.7)", textDecoration: "line-through" }}>{money(input.compareAtPrice, input.currency)}</div>
      )}
    </div>
  );
}

function Cta({ text, accent }: { text: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignSelf: "flex-start", padding: "22px 44px", borderRadius: 999, background: accent, color: inkOn(accent), fontSize: 40, fontWeight: 800 }}>{text}</div>
  );
}

/** The four layouts. Each one keeps the product photo untouched: only the frame, the words and the colors change. */
function Layout({ input }: { input: RenderInput }) {
  const { width, height } = sizeFor(input.format);
  const color = input.brand.color ?? DEFAULT_COLOR;
  const accent = input.brand.accent ?? DEFAULT_ACCENT;
  const ink = inkOn(color);
  const headline = input.creative.headline || input.name;
  const cta = input.creative.cta || "Compra ya";
  const pad = 72;

  if (input.template === "offer") {
    const photoHeight = Math.round(height * 0.58);
    return (
      <div style={{ display: "flex", flexDirection: "column", width, height, background: color, fontFamily: "Inter" }}>
        <div style={{ display: "flex", position: "relative", width, height: photoHeight }}>
          <Photo input={input} style={{ width, height: photoHeight }} />
          <div style={{ display: "flex", position: "absolute", top: 48, left: 48, padding: "14px 22px", borderRadius: 20, background: "rgba(255,255,255,.92)" }}>
            <Logo input={input} dark={false} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: `${pad - 12}px ${pad}px`, gap: 28, justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: fit(72, headline), fontWeight: 800, color: ink, lineHeight: 1.05, letterSpacing: -2 }}>{headline}</div>
          <Price input={input} accent={accent} size={120} />
          <Cta text={cta} accent={accent} />
        </div>
      </div>
    );
  }

  if (input.template === "launch") {
    const box = width - pad * 2;
    return (
      <div style={{ display: "flex", flexDirection: "column", width, height, background: color, padding: pad, gap: 32, fontFamily: "Inter" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo input={input} dark={ink === "#FFFFFF"} />
          <div style={{ display: "flex", padding: "14px 30px", borderRadius: 999, background: accent, color: inkOn(accent), fontSize: 36, fontWeight: 800, letterSpacing: 2 }}>NUEVO</div>
        </div>
        <Photo input={input} style={{ width: box, height: Math.round(box * (input.format === "story" ? 1.2 : 0.7)), borderRadius: 40 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: "auto" }}>
          <div style={{ display: "flex", fontSize: fit(70, headline), fontWeight: 800, color: ink, lineHeight: 1.04, letterSpacing: -2 }}>{headline}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Price input={input} accent={accent} size={84} />
          </div>
          <Cta text={cta} accent={accent} />
        </div>
      </div>
    );
  }

  if (input.template === "benefits") {
    const items = (input.creative.benefits?.length ? input.creative.benefits : benefitsFrom(input.description)).slice(0, 3);
    const photoHeight = Math.round(height * 0.5);
    return (
      <div style={{ display: "flex", flexDirection: "column", width, height, background: "#FFFFFF", fontFamily: "Inter" }}>
        <Photo input={input} style={{ width, height: photoHeight }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: pad, gap: 26 }}>
          <div style={{ display: "flex", fontSize: fit(66, headline), fontWeight: 800, color: "#14161A", lineHeight: 1.05, letterSpacing: -2 }}>{headline}</div>
          {items.map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 40, color: "#2B2F36" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 999, background: accent, color: inkOn(accent), fontSize: 32, fontWeight: 800 }}>✓</div>
              <div style={{ display: "flex", flex: 1 }}>{item}</div>
            </div>
          ))}
          <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", alignItems: "center" }}>
            <Logo input={input} dark={false} />
            {input.price !== null && input.creative.showPrice !== false && (
              <div style={{ display: "flex", padding: "16px 34px", borderRadius: 999, background: color, color: ink, fontSize: 44, fontWeight: 800 }}>{money(input.price, input.currency)}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // highlight
  const benefit = input.creative.benefits?.[0] ?? benefitsFrom(input.description)[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", width, height, background: "#F5F6F3", padding: pad, gap: 40, fontFamily: "Inter" }}>
      <Photo input={input} style={{ width: width - pad * 2, height: Math.round(height * 0.6), borderRadius: 36 }} />
      <div style={{ display: "flex", width: 120, height: 10, borderRadius: 10, background: accent }} />
      <div style={{ display: "flex", fontSize: fit(74, headline), fontWeight: 800, color: "#14161A", lineHeight: 1.04, letterSpacing: -2 }}>{headline}</div>
      {benefit && <div style={{ display: "flex", fontSize: 40, color: "#565B64" }}>{benefit}</div>}
      <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", alignItems: "center" }}>
        <Logo input={input} dark={false} />
        {input.price !== null && input.creative.showPrice !== false && <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color }}>{money(input.price, input.currency)}</div>}
      </div>
    </div>
  );
}

/** Draws a template as a JPEG, the format Instagram takes. */
export async function renderCreative(input: RenderInput) {
  const { width, height } = sizeFor(input.format);
  const [medium, heavy] = await Promise.all([font(500), font(800)]);
  const image = new ImageResponse(<Layout input={input} />, {
    width,
    height,
    fonts: [
      ...(medium ? [{ name: "Inter", data: medium, weight: 500 as const, style: "normal" as const }] : []),
      ...(heavy ? [{ name: "Inter", data: heavy, weight: 800 as const, style: "normal" as const }] : []),
    ],
  });
  const png = Buffer.from(await image.arrayBuffer());
  return sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
